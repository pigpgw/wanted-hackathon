import type {
  DecomposeInput,
  DecomposeResult,
  ExecuteInput,
  ExecuteResult,
  ReviseInput,
  ReviseResult,
  WorkStep,
} from "./types";
import { findPresetByDescription } from "./presets";
import { codeVerify } from "./verify";

const DECOMPOSE_SYSTEM = `당신은 직장인의 업무를 분석하는 "업무 해킹" 에이전트입니다.
사용자가 반복 업무를 자유롭게 서술하면, 업무를 구체적 단계로 분해하고 각 단계의 자동화 적합도를 판정합니다.

규칙:
- 단계는 3~6개. 실제 업무 흐름 순서대로.
- 각 단계에 자동화 적합도 점수(1~5) 부여. 기준: 반복성·규칙성(판단을 말로 설명 가능한가)·디지털 입출력·소요시간·가역성(틀려도 피해 적은가).
- execution_type 분류:
  - "executable": 텍스트/표 데이터 변환 — 지금 샘플 데이터로 바로 실행 가능
  - "integration_needed": 외부 시스템 연동 필요 (수집·발송·사내DB)
  - "human_judgment": 사람 판단·승인이 핵심
- executable 판정 기준(엄격): 사용자가 원하는 **결과물 자체**가 샘플 데이터의 텍스트/표 변환으로 만들어질 때만. 외부 연동이 전제이거나 핵심이 판단·결정인 업무에서, "정리·표·계획" 같은 보조 산출물을 위해 단계를 지어내 executable로 분류하지 마세요.
- 산출물 유형으로 판정: 문서·초안·표·정제 데이터 같은 **텍스트 아티팩트 자체가 업무의 산출물**이면 executable (예: 보고서·뉴스레터·분류표 작성). 산출물이 결정·판단·승인·외부 시스템 변경이면 executable 아님 — 그 판단을 표·문서로 옮길 수 있어도 마찬가지입니다.
- executable이 하나도 없는 것도 정상 결과입니다 — 그 경우 recommended_step_id는 사용자의 핵심 병목(integration_needed/human_judgment) 단계를 가리키세요.
- recommended_step_id: executable이 있으면 그중 효과 큰 1개, 없으면 핵심 병목 1개.
- manual_minutes_est: 사용자가 밝힌 수동 시간 또는 합리적 추정치(분).

반드시 JSON만 출력: {"task_title": string, "steps": [{"id": number, "name": string, "score": number, "rationale": string, "execution_type": "executable"|"integration_needed"|"human_judgment"}], "recommended_step_id": number, "manual_minutes_est": number}`;

const EXECUTE_SYSTEM = `당신은 업무 자동화 "실행" 에이전트입니다. 조언이 아니라 실제로 일을 수행합니다.
사용자가 선택한 업무 단계와 샘플 데이터를 주면, 그 단계를 실제로 수행해 결과물을 출력합니다.

규칙:
- result_artifact: 방법 설명이 아니라 **실행 결과물 자체**를 마크다운으로 출력 (표·정제 데이터·초안 문서). "이렇게 하면 됩니다" 같은 조언 금지.
- 사용자가 "결과 양식"을 제공하면 result_artifact는 그 양식의 구조·컬럼·항목명을 그대로 따라 채웁니다. 양식에 없는 정보가 필요하면 지어내지 말고 caveat로 표시.
- 데이터에 없는 수치를 지어내지 마세요. 계산 불가한 것은 caveat로 표시.
- verification: 결과물에 포함된 핵심 수치·사실 3~6개를 골라 검증 카드를 작성합니다. 각 항목에 claim(결과물의 수치·사실), basis(샘플 데이터의 어느 행·값에서 나왔는지 근거 인용), status("ok"=재계산 일치, "check"=근거 불명확·확인 필요). summary에 "N건 중 M건 일치" 요약.
- prompt_pack: 이 작업을 매주 재사용할 수 있는 (1) 복사 가능한 프롬프트 (2) SOP 절차 — 마크다운.
- caveats: 샘플 기준 한계, 검토 필요 사항을 솔직하게.

반드시 JSON만 출력: {"result_artifact": string(마크다운), "artifact_type": "report"|"table"|"draft"|"other", "execution_seconds": number, "manual_minutes_est": number, "prompt_pack": string(마크다운), "caveats": string[], "verification": {"items": [{"claim": string, "basis": string, "status": "ok"|"check"}], "summary": string}}`;

const REVISE_SYSTEM = `당신은 업무 결과물을 수정하는 에이전트입니다.
사용자가 현재 결과물(마크다운)과 자연어 수정 지시를 주면, 지시대로 수정한 **전체 결과물**을 다시 출력합니다.

규칙:
- 지시한 부분만 바꾸고 나머지는 원본을 유지합니다.
- 데이터에 없는 수치를 새로 지어내지 마세요. 지시가 데이터와 모순되면 원본을 유지하고 그대로 출력.
- 사용자가 "결과 양식"을 제공하면 그 구조를 유지합니다.
- 조언·설명 없이 수정된 결과물 마크다운만 출력.

반드시 JSON만 출력: {"result_artifact": string(마크다운)}`;

async function callLLM(system: string, user: string): Promise<string> {
  const baseURL = process.env.LLM_BASE_URL ?? "https://api.upstage.ai/v1";
  const model = process.env.LLM_MODEL ?? "solar-pro3";
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY not set");

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function mockDecompose(input: DecomposeInput): DecomposeResult {
  // 프리셋과 일치하면 캐시된 결과 반환
  const preset = findPresetByDescription(input.work_description);
  if (preset) return preset.decompose;

  // 키 없을 때의 범용 mock — 플로우 확인용
  return {
    task_title: "서술하신 반복 업무",
    steps: [
      {
        id: 1,
        name: "자료·데이터 수집",
        score: 2,
        rationale: "외부 시스템·채널 연동이 필요한 단계로 보입니다 (데모 mock)",
        execution_type: "integration_needed",
      },
      {
        id: 2,
        name: "데이터 정리·가공",
        score: 4,
        rationale: "규칙성 있는 표/텍스트 변환으로 추정 — 자동화 적합 (데모 mock)",
        execution_type: "executable",
      },
      {
        id: 3,
        name: "결과물 작성·초안",
        score: 4,
        rationale: "정형 문서 생성으로 추정 — 자동화 적합 (데모 mock)",
        execution_type: "executable",
      },
      {
        id: 4,
        name: "검토·공유",
        score: 1,
        rationale: "최종 판단·발송은 사람 영역 (데모 mock)",
        execution_type: "human_judgment",
      },
    ],
    recommended_step_id: 2,
    manual_minutes_est: input.manual_minutes ?? 30,
  };
}

function mockExecute(input: ExecuteInput): ExecuteResult {
  // 프리셋 캐시는 API 라우트에서 먼저 조회함 — 여기는 범용 mock
  return {
    artifact_type: "table",
    execution_seconds: 0,
    manual_minutes_est: 30,
    result_artifact: `## 실행 결과 (데모 mock — API 키 미설정)

선택한 단계: **${input.step.name}**

샘플 데이터 ${input.sample_data.length}자를 받았습니다. 실제 LLM 연결 후 이 자리에 변환된 결과물(정제 표·초안 문서)이 표시됩니다.`,
    prompt_pack: `## 실행 아티팩트 (데모 mock)\n\nAPI 키 설정 후 재사용 프롬프트+SOP가 생성됩니다.`,
    caveats: ["현재 데모 mock 상태 — LLM_API_KEY 설정 시 실제 실행됩니다"],
  };
}

export async function decompose(input: DecomposeInput): Promise<DecomposeResult> {
  if (!process.env.LLM_API_KEY) return mockDecompose(input);
  const user = `업무 서술: ${input.work_description}\n반복 빈도: ${input.frequency ?? "미상"}\n수동 소요 시간: ${input.manual_minutes ? `${input.manual_minutes}분` : "미상"}`;
  const raw = await callLLM(DECOMPOSE_SYSTEM, user);
  const parsed = JSON.parse(raw) as DecomposeResult;
  validateDecompose(parsed);
  return parsed;
}

export async function execute(input: ExecuteInput): Promise<ExecuteResult> {
  if (!process.env.LLM_API_KEY) return mockExecute(input);
  const formatBlock = input.output_format?.trim()
    ? `\n\n결과 양식 (이 구조·항목명 그대로 채울 것):\n${input.output_format}`
    : "";
  const user = `업무: ${input.task_title}\n실행할 단계: ${input.step.name} (설명: ${input.step.rationale})\n\n샘플 데이터 (${input.sample_filename ?? "data"}):\n${input.sample_data}${formatBlock}`;
  const started = Date.now();
  const raw = await callLLM(EXECUTE_SYSTEM, user);
  const parsed = JSON.parse(raw) as ExecuteResult;
  parsed.execution_seconds = Math.round((Date.now() - started) / 1000);
  // 코드 재계산이 가능하면 LLM 자기 검증보다 우선 — LLM은 자기 수치를 그대로 승인하는 경향이 있음
  const cv = codeVerify(parsed.result_artifact, input.sample_data);
  if (cv) parsed.verification = cv;
  return parsed;
}

export async function revise(input: ReviseInput): Promise<ReviseResult> {
  const formatBlock = input.output_format?.trim()
    ? `\n\n결과 양식 (이 구조를 유지할 것):\n${input.output_format}`
    : "";
  const user = `업무: ${input.task_title ?? "결과물"}\n\n현재 결과물:\n${input.result_artifact}\n\n수정 지시: ${input.instruction}${formatBlock}`;
  const raw = await callLLM(REVISE_SYSTEM, user);
  const parsed = JSON.parse(raw) as ReviseResult;
  // 수정본에 대해 코드 재계산 검증 재수행 — 지적→수정→재검증 "일치" 루프
  if (input.sample_data) {
    const cv = codeVerify(parsed.result_artifact, input.sample_data);
    if (cv) parsed.verification = cv;
  }
  return parsed;
}

function validateDecompose(r: DecomposeResult): void {
  if (!r.task_title || !Array.isArray(r.steps) || r.steps.length === 0) {
    throw new Error("invalid decompose response");
  }
  for (const s of r.steps as WorkStep[]) {
    if (!s.name || typeof s.score !== "number" || !s.execution_type) {
      throw new Error("invalid step in decompose response");
    }
  }
}
