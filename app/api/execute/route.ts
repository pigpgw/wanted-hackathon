import { NextResponse } from "next/server";
import type { ExecuteInput, ExecutionType } from "@/lib/types";
import * as engine from "@/lib/engine";
import { presets } from "@/lib/presets";

export const maxDuration = 60;

const MAX_SAMPLE_BYTES = 500 * 1024; // 500KB (service_design.md §4)
const VALID_TYPES: readonly ExecutionType[] = [
  "executable",
  "integration_needed",
  "human_judgment",
];

// LLM 에러/JSON 파싱 실패 시 1회 재시도 (service_design.md §10)
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
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

  const normalized: ExecuteInput = {
    step,
    task_title: input.task_title.trim(),
    sample_data: input.sample_data,
    ...(typeof input.sample_filename === "string" && input.sample_filename
      ? { sample_filename: input.sample_filename }
      : {}),
  };

  // 프리셋 캐시 — task_title·step.id·sample_data 모두 일치할 때만 (다른 데이터에 통조림 결과 반환 방지)
  const preset = presets.find(
    (p) =>
      p.decompose.task_title === normalized.task_title &&
      p.sample_data === normalized.sample_data &&
      p.execute[normalized.step.id] !== undefined
  );
  if (preset) {
    return NextResponse.json(preset.execute[normalized.step.id]);
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
      return NextResponse.json(fallback.execute[normalized.step.id]);
    }
    return NextResponse.json(
      { error: "실행 실패 — 다시 시도해 주세요" },
      { status: 502 }
    );
  }
}
