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
}

export interface ExecuteResult {
  result_artifact: string; // 마크다운 — 실제 실행 결과물
  artifact_type: "report" | "table" | "draft" | "other";
  execution_seconds: number;
  manual_minutes_est: number;
  prompt_pack: string; // 재사용 프롬프트 + SOP
  caveats: string[];
}
