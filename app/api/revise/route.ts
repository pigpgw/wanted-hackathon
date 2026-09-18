import { NextResponse } from "next/server";
import type { ReviseInput } from "@/lib/types";
import * as engine from "@/lib/engine";

export const maxDuration = 60;

const MAX_ARTIFACT_BYTES = 500 * 1024;

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

  const input = body as Partial<ReviseInput>;

  if (typeof input.result_artifact !== "string" || !input.result_artifact.trim()) {
    return NextResponse.json(
      { error: "result_artifact가 필요합니다" },
      { status: 400 }
    );
  }
  if (typeof input.instruction !== "string" || !input.instruction.trim()) {
    return NextResponse.json(
      { error: "instruction이 필요합니다" },
      { status: 400 }
    );
  }
  if (Buffer.byteLength(input.result_artifact, "utf8") > MAX_ARTIFACT_BYTES) {
    return NextResponse.json(
      { error: "result_artifact는 500KB를 초과할 수 없습니다" },
      { status: 413 }
    );
  }

  const normalized: ReviseInput = {
    result_artifact: input.result_artifact,
    instruction: input.instruction.trim(),
    ...(typeof input.task_title === "string" && input.task_title
      ? { task_title: input.task_title }
      : {}),
    ...(typeof input.output_format === "string" && input.output_format.trim()
      ? { output_format: input.output_format }
      : {}),
    ...(typeof input.sample_data === "string" &&
    input.sample_data &&
    Buffer.byteLength(input.sample_data, "utf8") <= MAX_ARTIFACT_BYTES
      ? { sample_data: input.sample_data }
      : {}),
  };

  try {
    const result = await withRetry(() => engine.revise(normalized));
    return NextResponse.json(result);
  } catch (err) {
    console.error("revise failed after retry:", err);
    return NextResponse.json(
      { error: "수정 실패 — 다시 시도해 주세요" },
      { status: 502 }
    );
  }
}
