import type { DecomposeResult, ExecuteResult } from "./types";

export interface Preset {
  id: string;
  label: string;
  work_description: string;
  frequency: string;
  manual_minutes: number;
  decompose: DecomposeResult;
  execute: Record<number, ExecuteResult>; // step.id → 캐시된 실행 결과
  sample_data: string;
  sample_filename: string;
}

const salesDecompose: DecomposeResult = {
  task_title: "주간 매출 보고서 작성",
  steps: [
    {
      id: 1,
      name: "각 채널 매출 데이터 수집·취합",
      score: 2,
      rationale: "사내 시스템·여러 채널에서 데이터를 가져와야 해 외부 연동이 필요합니다",
      execution_type: "integration_needed",
    },
    {
      id: 2,
      name: "매출 데이터 정리·주간 집계",
      score: 5,
      rationale: "규칙이 명확하고 입출력이 모두 표 데이터. 매주 반복되며 틀려도 재실행하면 됩니다",
      execution_type: "executable",
    },
    {
      id: 3,
      name: "보고서 초안 작성",
      score: 4,
      rationale: "정형 포맷의 텍스트 생성이라 자동화 적합. 최종 문장 다듬기는 사람 검토 권장",
      execution_type: "executable",
    },
    {
      id: 4,
      name: "팀장 검토 후 최종 발송",
      score: 1,
      rationale: "최종 승인·발송은 사람 판단 영역. 자동화보다 '초안+승인' 반자동이 안전합니다",
      execution_type: "human_judgment",
    },
  ],
  recommended_step_id: 2,
  manual_minutes_est: 40,
};

const salesSample = `date,channel,product,amount
2026-09-07,online,SKU-101,152000
2026-09-07,offline,SKU-102,89000
2026-09-08,online,SKU-101,201000
2026-09-08,partner,SKU-103,176000
2026-09-09,online,SKU-102,134000
2026-09-09,offline,SKU-101,98000
2026-09-10,partner,SKU-103,220000
2026-09-10,online,SKU-101,187000
2026-09-11,offline,SKU-102,143000
2026-09-11,online,SKU-103,166000
2026-09-12,partner,SKU-101,199000
2026-09-12,online,SKU-102,121000`;

const salesExecute: ExecuteResult = {
  artifact_type: "table",
  execution_seconds: 28,
  manual_minutes_est: 40,
  result_artifact: `## 주간 매출 집계 결과 (2026-09-07 ~ 09-12)

### 채널별 매출
| 채널 | 건수 | 매출액 | 비중 |
|---|---|---|---|
| online | 6 | 961,000원 | 51.0% |
| partner | 3 | 595,000원 | 31.5% |
| offline | 3 | 330,000원 | 17.5% |
| **합계** | **12** | **1,886,000원** | 100% |

### 상품별 매출
| 상품 | 매출액 |
|---|---|
| SKU-101 | 837,000원 |
| SKU-103 | 562,000원 |
| SKU-102 | 487,000원 |

### 주요 포인트
- 온라인 채널이 전체 매출의 과반(51.0%) — 전주 대비 추이는 지난 데이터 필요
- partner 채널은 건당 평균 단가가 가장 높음 (약 198,000원)
- SKU-102 매출이 3개 SKU 중 최저 — 재고·프로모션 점검 후보`,
  prompt_pack: `## 매주 재사용 가능한 실행 아티팩트

### 프롬프트 (그대로 복사해 재사용)
다음 CSV 매출 데이터를 주간 집계해줘. 출력 형식: (1) 채널별 건수·매출액·비중 표 (2) 상품별 매출 표 (3) 주요 포인트 3개. 채널/상품 컬럼이 다르면 가장 유사한 컬럼으로 매핑하고 매핑 내용을 알려줘.

### SOP (매주 반복 절차)
1. 월요일 오전, 지난 주 매출 CSV를 내려받는다
2. 위 프롬프트 + CSV를 붙여넣는다
3. 출력 표의 합계가 원본 합계와 일치하는지 확인한다
4. 보고서 양식에 붙여넣고, 특이사항 1~2줄만 수동 추가한다`,
  caveats: [
    "샘플 12행 기준 실행 — 실제 데이터에서는 컬럼명·포맷 확인 필요",
    "전주 대비 증감은 지난 주 데이터가 있어야 계산 가능",
  ],
};

export const presets: Preset[] = [
  {
    id: "sales-report",
    label: "매주 매출 보고서",
    work_description:
      "매주 월요일마다 각 채널 매출 데이터를 모아서 정리하고, 팀장님께 올릴 주간 보고서를 써요. 데이터 정리에만 40분 정도 걸려요.",
    frequency: "주 1회",
    manual_minutes: 40,
    decompose: salesDecompose,
    execute: { 2: salesExecute },
    sample_data: salesSample,
    sample_filename: "sales_week.csv",
  },
  {
    id: "inquiry-triage",
    label: "고객 문의 분류",
    work_description:
      "매일 여러 채널로 들어오는 고객 문의를 읽고 유형별로 분류해서 표로 정리해요. 비슷한 문의에는 비슷한 답변을 쓰는데 매번 새로 쓰고 있어요.",
    frequency: "매일",
    manual_minutes: 60,
    decompose: {
      task_title: "고객 문의 분류·정리",
      steps: [
        {
          id: 1,
          name: "채널별 문의 수집",
          score: 2,
          rationale: "채널마다 접근 방식이 달라 연동이 필요합니다",
          execution_type: "integration_needed",
        },
        {
          id: 2,
          name: "문의 유형 분류·표 정리",
          score: 5,
          rationale: "분류 기준을 말로 설명 가능하고 입출력이 텍스트·표라 즉시 실행 가능",
          execution_type: "executable",
        },
        {
          id: 3,
          name: "유형별 답변 초안 작성",
          score: 4,
          rationale: "반복 문의는 정형 답변이 가능. 민감 문의는 사람 검토 후 발송 권장",
          execution_type: "executable",
        },
        {
          id: 4,
          name: "긴급·민감 문의 에스컬레이션",
          score: 2,
          rationale: "판단 책임이 커서 사람 판단 권장 — AI는 '후보 표시'까지만",
          execution_type: "human_judgment",
        },
      ],
      recommended_step_id: 2,
      manual_minutes_est: 60,
    },
    execute: {
      2: {
        artifact_type: "table",
        execution_seconds: 24,
        manual_minutes_est: 60,
        result_artifact: `## 문의 분류 결과 (샘플 8건)

| # | 문의 요지 | 유형 | 긴급도 | 추천 답변 방향 |
|---|---|---|---|---|
| 1 | 배송이 일주일째 안 옴 | 배송 지연 | 높음 | 송장 확인 후 지연 사과+예상일 안내 |
| 2 | 환불 언제 되나요 | 환불 진행 | 중간 | 처리 단계·소요일 안내 |
| 3 | 사이즈 교환 가능한가요 | 교환 요청 | 낮음 | 교환 절차·택배 접수 안내 |
| 4 | 성분 표시가 사진과 달라요 | 상품 정보 | 높음 | 상세 확인 요청 + 오류 시 정정 약속 |
| 5 | 쿠폰 적용이 안 돼요 | 결제/프로모션 | 중간 | 적용 조건 확인 안내 |
| 6 | 회원 탈퇴하고 싶어요 | 계정 | 낮음 | 탈퇴 경로·유의사항 안내 |
| 7 | 같은 상품 두 개 왔어요 | 배송 오류 | 중간 | 수거 접수 + 정상 상품 확인 |
| 8 | 영수증 재발행 부탁 | 증빙 | 낮음 | 재발행 방법 안내 |

### 요약
- 전체 8건 중 **배송·환불 관련 5건(62%)** — 이 유형은 답변 템플릿 고정 가능
- 긴급 표시 2건: 배송 지연(송장 확인 필요), 성분 표시 불일치(실물 확인 필요) — 사람 확인 권장`,
        prompt_pack: `## 매주 재사용 가능한 실행 아티팩트

### 프롬프트 (그대로 복사해 재사용)
다음 고객 문의 목록을 유형별로 분류해줘. 출력 형식: (1) 번호·요지·유형·긴급도·답변 방향 표 (2) 유형별 건수 요약 (3) 긴급 표시된 건은 사람 확인이 필요한 이유 한 줄. 유형은 우리가 쓰는 분류(배송/환불/교환/상품정보/결제/계정/기타)로 맞춰줘.

### SOP
1. 매일 오전, 전날 문의를 한 곳에 붙여넣는다
2. 위 프롬프트로 분류 표를 만든다
3. 긴급 표시 건만 먼저 직접 확인한다
4. 나머지는 유형별 답변 초안으로 처리한다`,
        caveats: [
          "샘플 8건 기준 — 실제 문의는 개인정보 마스킹 후 입력 권장",
          "긴급도 판정은 참고용 — 최종 우선순위는 사람 확인",
        ],
      },
    },
    sample_data: `1. 배송이 일주일째 안 와요. 언제 오나요?
2. 환불 신청했는데 언제 입금되나요?
3. 사이즈가 안 맞아서 교환하고 싶어요
4. 상품 페이지 성분 표시랑 실제 라벨이 다른데요?
5. 쿠폰 코드 넣었는데 적용이 안 됩니다
6. 회원 탈퇴는 어디서 하나요?
7. 같은 상품이 두 개 배송됐어요
8. 영수증 다시 받을 수 있나요?`,
    sample_filename: "inquiries.txt",
  },
  {
    id: "meeting-minutes",
    label: "회의록 액션 정리",
    work_description:
      "주간 팀 회의가 끝나면 회의록을 정리해서 액션 아이템 뽑아서 팀 채널에 공유해요. 긴 대화록을 읽고 정리하는 데 매번 30분씩 써요.",
    frequency: "주 1회",
    manual_minutes: 30,
    decompose: {
      task_title: "회의록 액션 아이템 정리",
      steps: [
        {
          id: 1,
          name: "회의 녹음·메모 취합",
          score: 2,
          rationale: "녹음 도구·회의 시스템 연동이 필요합니다",
          execution_type: "integration_needed",
        },
        {
          id: 2,
          name: "대화록에서 결정사항·액션 추출",
          score: 5,
          rationale: "텍스트→구조화 표 변환. 기준(누가·무엇·언제까지)을 말로 설명 가능",
          execution_type: "executable",
        },
        {
          id: 3,
          name: "공유용 요약 작성",
          score: 4,
          rationale: "정형 요약 텍스트라 자동화 적합",
          execution_type: "executable",
        },
        {
          id: 4,
          name: "팀 채널 게시",
          score: 1,
          rationale: "최종 게시는 사람 확인 후 올리는 게 안전",
          execution_type: "human_judgment",
        },
      ],
      recommended_step_id: 2,
      manual_minutes_est: 30,
    },
    execute: {
      2: {
        artifact_type: "table",
        execution_seconds: 22,
        manual_minutes_est: 30,
        result_artifact: `## 회의 액션 아이템 (샘플 회의록)

| # | 액션 | 담당 | 기한 | 비고 |
|---|---|---|---|---|
| 1 | Q4 프로모션 시안 2종 제작 | 디자인-민수 | 9/19(금) | A/B 테스트용 |
| 2 | 신규 채널 단가표 검토 | 영업-지현 | 9/22(월) | 파트너사 조건 비교 포함 |
| 3 | CS 응답 매뉴얼 v2 배포 | CS-준호 | 9/24(수) | 지난 주 문의 사례 반영 |
| 4 | 재고 부족 SKU 발주 확인 | 물류-미정 | 이번 주 | SKU-102 우선 |

### 결정 사항
- Q4 프로모션은 온라인 채널 중심으로 진행 (오프라인은 다음 분기 재논의)
- CS 매뉴얼은 격주 업데이트로 전환

### 다음 회의 안건 후보
- 프로모션 시안 확정 / 신규 채널 계약 여부`,
        prompt_pack: `## 매주 재사용 가능한 실행 아티팩트

### 프롬프트 (그대로 복사해 재사용)
다음 회의록에서 액션 아이템과 결정 사항을 추출해줘. 출력 형식: (1) 액션 표 — 번호·액션·담당·기한·비고 (담당/기한 없으면 "미정" 표시) (2) 결정 사항 목록 (3) 다음 회의 안건 후보. 지어내지 말고 회의록에 있는 내용만.

### SOP
1. 회의 끝나면 녹취록·메모를 그대로 붙여넣는다
2. 위 프롬프트로 액션 표를 뽑는다
3. 담당·기한 "미정" 항목만 사람이 채운다
4. 팀 채널에 붙여넣기 전 결정 사항이 사실과 맞는지 훑는다`,
        caveats: [
          "샘플 회의록 기준 — 실제 녹취록은 발화자 오류가 있을 수 있어 담당 확인 권장",
          "민감 인사·평가 내용이 포함된 회의록은 입력 전 검토 필요",
        ],
      },
    },
    sample_data: `김팀장: Q4 프로모션 논의하죠. 온라인 중심으로 가는 거 어떤가요?
이영업: 저는 찬성이요. 대신 신규 채널 단가표를 먼저 봐야 해요. 제가 9/22까지 검토하겠습니다.
박디자인: 프로모션 시안은 A/B 두 개 만들면 되나요? 금요일까지 가능합니다.
김팀장: 좋아요, 민수 대신 디자인은 박디자인님이 맡아주세요. CS 매뉴얼은 준호씨가 지난주 문의 반영해서 수요일까지 배포해주세요. 격주 업데이트로 바꿉시다.
최물류: SKU-102 재고가 부족한데 발주는 제가 이번 주 안으로 확인할게요.
김팀장: 오프라인 프로모션은 다음 분기에 다시 봅시다. 오늘은 여기까지.`,
    sample_filename: "meeting_log.txt",
  },
];

export function findPresetByDescription(description: string): Preset | undefined {
  return presets.find((p) => p.work_description === description.trim());
}
