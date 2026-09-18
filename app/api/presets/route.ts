import { NextResponse } from "next/server";
import { presets } from "@/lib/presets";

// "예시로 체험" 1클릭 플로우용 — 프리셋 서술·샘플 데이터를 UI에 제공 (service_design.md §11)
export function GET() {
  return NextResponse.json(
    presets.map(
      ({
        id,
        label,
        work_description,
        frequency,
        manual_minutes,
        sample_filename,
        sample_data,
      }) => ({
        id,
        label,
        work_description,
        frequency,
        manual_minutes,
        sample_filename,
        sample_data,
      })
    )
  );
}
