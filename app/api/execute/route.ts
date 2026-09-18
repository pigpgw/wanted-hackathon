import { NextResponse } from "next/server";
import type { ExecuteInput, ExecutionType, ExecuteResult } from "@/lib/types";
import * as engine from "@/lib/engine";
import { presets } from "@/lib/presets";
import { codeVerify, isTabularSample } from "@/lib/verify";

export const maxDuration = 60;

const MAX_SAMPLE_BYTES = 500 * 1024; // 500KB (service_design.md §4)
const VALID_TYPES: readonly ExecutionType[] = [
  "executable",
  "integration_needed",
  "human_judgment",
];

// 캐시 결과의 검증 카드 출처 정직화 — 표 데이터면 코드 재계산으로 실제 검증, 아니면 AI 검토 표기
function withVerification(result: ExecuteResult, sample: string): ExecuteResult {
  const out: ExecuteResult = { ...result, cached: true };
  if (isTabularSample(sample)) {
    const cv = codeVerify(result.result_artifact, sample);
    if (cv) out.verification = cv;
  } else if (out.verification) {
    out.verification = { ...out.verification, source: "llm" };
  }
  return out;
}

// LLM 에러/JSON 파싱 실패 시 재시도 (service_design.md §10) — 429면 서버 지정 retryDelay 파싱해 대기, 총 대기 ≤50s
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 50_000;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === 2) break;
      const m = /retry in ([\d.]+)s/i.exec(String(err));
      const waitMs = m
        ? Math.ceil(parseFloat(m[1])) * 1000 + 500
        : 3000 * (attempt + 1);
      if (Date.now() + waitMs > deadline) break;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다" }, { status: 400 });
  }

  const input = body as Partial<ExecuteInput>;

  const step = input.step;
  if (
    !step ||
    typeof step !== "object" ||
    typeof step.id !== "number" ||
    typeof step.name !== "string" ||
    typeof step.score !== "number" ||
    typeof step.rationale !== "string" ||
    !VALID_TYPES.includes(step.execution_type)
  ) {
    return NextResponse.json(
      { error: "유효한 step 객체가 필요합니다" },
      { status: 400 }
    );
  }
  if (typeof input.task_title !== "string" || !input.task_title.trim()) {
    return NextResponse.json(
      { error: "task_title이 필요합니다" },
      { status: 400 }
    );
  }
  if (typeof input.sample_data !== "string" || !input.sample_data) {
    return NextResponse.json(
      { error: "sample_data가 필요합니다" },
      { status: 400 }
    );
  }
  if (Buffer.byteLength(input.sample_data, "utf8") > MAX_SAMPLE_BYTES) {
    return NextResponse.json(
      { error: "sample_data는 500KB를 초과할 수 없습니다" },
      { status: 413 }
    );
  }
  const output_format =
    typeof input.output_format === "string" ? input.output_format : undefined;
  if (output_format && Buffer.byteLength(output_format, "utf8") > MAX_SAMPLE_BYTES) {
    return NextResponse.json(
      { error: "output_format은 500KB를 초과할 수 없습니다" },
      { status: 413 }
    );
  }

  const normalized: ExecuteInput = {
    step,
    task_title: input.task_title.trim(),
    sample_data: input.sample_data,
    ...(typeof input.sample_filename === "string" && input.sample_filename
      ? { sample_filename: input.sample_filename }
      : {}),
    ...(output_format?.trim() ? { output_format } : {}),
  };

  // 프리셋 캐시 — task_title·step.id·sample_data 모두 일치할 때만 (다른 데이터에 통조림 결과 반환 방지)
  // output_format이 있으면 기본 양식 캐시와 결과가 달라지므로 캐시 우회
  const preset = output_format?.trim()
    ? undefined
    : presets.find(
        (p) =>
          p.decompose.task_title === normalized.task_title &&
          p.sample_data === normalized.sample_data &&
          p.execute[normalized.step.id] !== undefined
      );
  if (preset) {
    return NextResponse.json(
      withVerification(preset.execute[normalized.step.id], normalized.sample_data)
    );
  }

  try {
    const result = await withRetry(() => engine.execute(normalized));
    return NextResponse.json(result);
  } catch (err) {
    console.error("execute failed after retry:", err);
    const fallback = presets.find(
      (p) =>
        p.decompose.task_title === normalized.task_title &&
        p.sample_data === normalized.sample_data &&
        p.execute[normalized.step.id] !== undefined
    );
    if (fallback) {
      return NextResponse.json(
        withVerification(fallback.execute[normalized.step.id], normalized.sample_data)
      );
    }
    return NextResponse.json(
      { error: "실행 실패 — 다시 시도해 주세요" },
      { status: 502 }
    );
  }
}
