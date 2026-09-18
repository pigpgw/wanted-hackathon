import { NextResponse } from "next/server";
import type { DecomposeInput } from "@/lib/types";
import * as engine from "@/lib/engine";
import { findPresetByDescription } from "@/lib/presets";

export const maxDuration = 60;

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

  const input = body as Partial<DecomposeInput>;
  if (
    typeof input.work_description !== "string" ||
    !input.work_description.trim()
  ) {
    return NextResponse.json(
      { error: "work_description이 필요합니다" },
      { status: 400 }
    );
  }

  const normalized: DecomposeInput = {
    work_description: input.work_description.trim(),
    ...(typeof input.frequency === "string" && input.frequency.trim()
      ? { frequency: input.frequency.trim() }
      : {}),
    ...(typeof input.manual_minutes === "number" &&
    Number.isFinite(input.manual_minutes)
      ? { manual_minutes: input.manual_minutes }
      : {}),
  };

  // (a) 프리셋 캐시 — canonical 서술과 정확히 일치하면 즉시 반환
  const preset = findPresetByDescription(normalized.work_description);
  if (preset) return NextResponse.json(preset.decompose);

  // (b) 엔진 호출 — 실패 시 1회 재시도 → 그래도 실패하면 프리셋 폴백(해당 시) 또는 502
  try {
    const result = await withRetry(() => engine.decompose(normalized));
    return NextResponse.json(result);
  } catch (err) {
    console.error("decompose failed after retry:", err);
    const fallback = findPresetByDescription(normalized.work_description);
    if (fallback) return NextResponse.json(fallback.decompose);
    return NextResponse.json(
      { error: "분해 실패 — 다시 시도해 주세요" },
      { status: 502 }
    );
  }
}
