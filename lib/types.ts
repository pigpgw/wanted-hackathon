export type ExecutionType = "executable" | "integration_needed" | "human_judgment";

export interface DecomposeInput {
  work_description: string;
  frequency?: string;
  manual_minutes?: number;
}

export interface WorkStep {
  id: number;
  name: string;
  score: number; // 1~5 자동화 적합도
  rationale: string;
  execution_type: ExecutionType;
}

export interface DecomposeResult {
  task_title: string;
  steps: WorkStep[];
  recommended_step_id: number;
  manual_minutes_est: number;
}

export interface ExecuteInput {
  step: WorkStep;
  task_title: string;
  sample_data: string;
  sample_filename?: string;
  output_format?: string; // v2 — 사용자가 붙여넣은 결과 양식/형식 (있으면 그대로 채움)
}

export interface VerificationItem {
  claim: string; // 결과물 속 수치·사실
  basis: string; // 샘플 데이터의 어느 부분에서 나왔는지 (근거 인용)
  status: "ok" | "check"; // 재계산 일치 / 확인 필요
}

export interface VerificationCard {
  items: VerificationItem[];
  summary: string; // 예: "핵심 수치 5건 재계산 — 4건 일치, 1건 확인 필요"
}

export interface ExecuteResult {
  result_artifact: string; // 마크다운 — 실제 실행 결과물
  artifact_type: "report" | "table" | "draft" | "other";
  execution_seconds: number;
  manual_minutes_est: number;
  prompt_pack: string; // 재사용 프롬프트 + SOP
  caveats: string[];
  cached?: boolean; // 프리셋 사전 실측 결과인 경우 true
  verification?: VerificationCard; // v2 — 수치·사실 근거 검증 카드
}

// v2 — 자연어 수정
export interface ReviseInput {
  result_artifact: string; // 현재 결과물 (마크다운)
  instruction: string; // 자연어 수정 지시
  task_title?: string; // 문맥용
  output_format?: string; // 양식이 있었으면 유지
  sample_data?: string; // 있으면 수정 후 코드 재계산 검증도 다시 수행
}

export interface ReviseResult {
  result_artifact: string;
  verification?: VerificationCard; // sample_data 제공 시 수정본 기준 재검증
}
