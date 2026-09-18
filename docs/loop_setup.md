# Loop Setup — 루프 엔지니어링 실행 설계

`docs/loop.md`의 추상 루프(Discover→Triage→Act→Verify→Report→Remember)를 실제 도구에 매핑한 실행 설계.
대상 서비스: **A 업무→실행 자동화기** (`docs/service_design.md`). 참고한 공식 수단: Devin CLI `/loop`, hooks, skills, `devin -p`.

## 1. 전체 구조

```
eval_set/cases/<case-id>/        # 평가셋 (입력 + 기대값)
  description.txt                #   업무 자유 서술
  sample.csv|txt|md              #   실행 단계용 샘플 데이터
  expected.json                  #   수작업 기대 태그 (§4 스키마)
eval_runs/<timestamp>/           # 반복마다 1디렉터리 — 재현 가능한 실행 기록
  raw/<case-id>.json             #   decompose+execute 원시 응답
  scores.json / scores.md        #   자동 채점 결과
  triage.md                      #   P0/P1/P2 분류 (스킬이 작성)
scripts/
  eval_run.py                    #   평가셋 → 로컬/배포 엔드포인트 실행 + 자동 채점
  ops_check.sh                   #   운영 루프: 생존+지연+canonical 실행 → ops_log.md
  loop_context.sh                #   SessionStart 훅: NEXT.md+최근 점수 컨텍스트 주입
  loop_gate.sh                   #   Stop 훅: 코드 변경 후 eval 미실행 시 stop 차단
.devin/
  hooks.v1.json                  #   SessionStart + Stop 훅 등록
  skills/loop-iterate/SKILL.md   #   반복 1회 전체를 수행하는 오케스트레이터 스킬
.agents/skills/work-hack-eval/   #   평가셋 채점 스킬 (기존, eval_run.py 결과 위에서 동작)
NEXT.md / DECISIONS.md           # 상태 파일 (Report / Remember)
ops_log.md                       # 운영 루프 일별 기록 (배포 후 생성)
```

## 2. 루프 1 — 빌드 루프 (지금 ~ 9/20)

### 단계 → 도구 매핑

| 루프 단계 | 도구 | 산출물 |
|---|---|---|
| Discover | `scripts/eval_run.py --base-url http://localhost:3000` | `eval_runs/<ts>/raw/*.json`, `scores.json` |
| 채점(자동) | `eval_run.py` 내장 — 실행 성공·분류 일치·스키마 검증 | `scores.json` |
| 채점(인간/LLM) | `/work-hack-eval` 스킬 — 분해 적절성·결과물 채택률 3단계 | `scores.md` 보강 |
| Triage | `/loop-iterate` 스킬이 작성 | `eval_runs/<ts>/triage.md` |
| Act | `edit` — 프롬프트/파이프라인/실행 로직 **1변수만** | 코드 diff |
| Verify | `eval_run.py` 재실행 → 직전 run과 `scores.json` 비교 | `eval_runs/<ts+1>/` |
| Report | `NEXT.md` 갱신 | — |
| Remember | `DECISIONS.md`에 날짜·변경 변수·가설·결과 기록 | — |

### 구동 방식 2가지

**(a) 수동 반복 (기본)** — 매 반복 `/loop-iterate` 호출. 스킬이 Discover→Triage→1개 수정 제안→사용자 승인→Verify까지 1회 수행. 변수 통제가 확실해서 권장.

**(b) `/loop` 커맨드 (공식 내장)** — 세션에서 `/loop eval_set을 돌려 P0를 고치고 eval_runs에 기록해` 형태로 실행하면 프롬프트 실행→diff 자동 리뷰를 반복.
- 전제: **clean git state** → 시작 전 커밋 필수.
- 주의: 자동 리뷰가 "1변수" 원칙을 깰 수 있음 → 프롬프트에 "한 번에 프롬프트 또는 코드 한 곳만 수정" 명시.

### Stop 훅 게이트

`scripts/loop_gate.sh`: 서비스 코드(`app/`, `lib/`, `prompts/` 등)가 마지막 eval 실행 이후 변경됐는데 새 eval_runs가 없으면 stop을 block하고 `/work-hack-eval` 실행을 요구.
- 활성화 조건: `eval_set/cases`에 케이스 있음 **+ `eval_runs/`가 1회 이상 존재** — 첫 빌드 중엔 eval 파이프라인이 없어 block만 반복되므로, "eval 이후 변경 회귀"가 생길 수 있는 시점부터만 감시.
- 긴급 우회: `touch .loop_gate_off` (사유를 DECISIONS.md에 남길 것).
- Stop 훅은 무한 루프 위험이 있어(공식 문서 경고) "미실행 eval" 단 1개 조건만 검사 — 점수 미달을 이유로는 block하지 않음(그건 stop condition 판정은 사람/스킬이 함).

### Stop condition → 동결 절차

`eval_run.py` + 인간 채점 합산: **P0=0 · 실행 성공률 ≥90% · 분해 적절성 ≥80%** 도달 시
1. `NEXT.md`에 "구현 동결" 기록 → 2. 배포 → 3. 운영 루프로 전환.
cap 10회 도달 시: P0만 남기고 출시, 잔여 P1/P2는 DECISIONS.md에 "known issues"로 기록(본선 발표 방어 자료가 됨).

## 3. 루프 2 — 운영 루프 (9/21 ~ 10/5)

`scripts/ops_check.sh <서비스 URL>`을 1일 1회 실행 (cron 또는 launchd — macOS).

수행: `curl -I` 상태코드+응답시간 → canonical 케이스 1건으로 `/api/decompose` 실측 → `ops_log.md`에 1행 append → 실패 시 exit 1.

- **LLM 세션은 생존 확인에 쓰지 않음** — curl이면 충분. P0(다운·5xx·canonical 실행 실패) 감지 시에만 `devin -p "ops_log.md 마지막 실패 진단하고 수정안 제안"`으로 진단 세션을 여는 2단 구조 (비용 절약 + 공식 `-p` 자동화 활용).
- 기능 변경 동결: 이 기간 코드 diff는 오직 P0 핫픽스만 허용 — loop_gate.sh가 아니라 **사람 규칙**으로 강제(훅으로 막으면 핫픽스까지 막힘).

## 4. 평가셋 스키마 (`eval_set/cases/<id>/expected.json`)

```json
{
  "id": "case-01",
  "type": "report",                       // report|transform|draft|boundary
  "expected_steps": ["데이터 정제", "요약 보고서 작성"],
  "expected_automatable": {
    "executable_at_least_one": true,
    "recommended_step_should_be": "executable"
  },
  "sample_file": "sample.csv",
  "notes": "canonical 데모 케이스와 유사 — 평가셋은 데모 입력과 겹치지 않게 유지"
}
```

케이스 구성 (service_design.md §12): 정리·보고·변환 8개 + 경계(실행불가·모호·비정형) 4~7개. 경계 케이스는 `expected_automatable.executable_at_least_one: false`로 "정직한 분해"가 정답임을 태깅.

## 5. 점수 체계 (measurement.md 매핑)

| 지표 | 채점자 | 산출 | stop condition |
|---|---|---|---|
| 실행 성공 (P0) | 자동 — `result_artifact` 비어있지 않고 에러 없음 | eval_run.py | P0 = 0, 성공률 ≥90% |
| "조언으로 끝남" (P0) | 자동 휴리스틱(결과물이 지시문 형태) + 인간 확인 | eval_run.py flag → 스킬 확인 | 0 |
| 실행 가능성 분류 일치 | 자동 — `execution_type` vs expected | eval_run.py | 추이 추적 |
| 분해 적절성 | 인간/LLM 3단계 vs `expected_steps` | work-hack-eval | ≥80% |
| 결과물 채택률 | 인간 3단계 (그대로/수정후/재작업) | work-hack-eval | ≥80% |
| North Star(절감 시간) | `execution_seconds` vs `manual_minutes` | 화면 표시용 | 데모 문구 |

## 6. 1변수 규칙의 실행 장치

`DECISIONS.md` 반복 로그 템플릿:

```
## YYYY-MM-DD HH:mm — iter N
- 변경 변수: (프롬프트/스키마/실행로직/UI 중 1개 + 파일)
- 가설: 이 변경이 어떤 오류를 줄일 것인가
- eval: scores.json delta (전 run 대비 P0 ±n, 성공률 ±%p)
- 판정: keep / revert
```

`eval_runs/`가 타임스탬프 디렉터리라 직전 run과의 diff가 항상 가능 → "나아진 것 같은데?"를 숫자로 검증.

## 7. 세션 시작 컨텍스트 (SessionStart 훅)

`loop_context.sh`가 매 세션 시작 시 다음을 `additionalContext`로 주입:
- `NEXT.md`의 "지금 진행 중/다음 행동"
- 최근 `eval_runs/` 점수 요약(있으면)
- 현재 루프 모드(BUILD/OPS — `ops_log.md` 존재 여부로 판정)

→ 어느 세션에서 시작해도 "지금 루프가 어디까지 왔는가"를 Devin이 자동 인지. 상태 파일이 곧 루프의 메모리.

## 8. 미결/리스크

- `eval_run.py`의 `/api/execute` 요청 형식은 service_design.md §4 계약 기준 — 구현 시 필드명 확정되면 스크립트 맞춰야 함.
- 인간 채점(분해 적절성·채택률)은 해커톤 기간엔 본인 1인 평가 — 편향 인정, 데모 프리셋은 평가셋과 분리 원칙으로 완화.
- `/loop`는 diff 자동 리뷰 기반이라 프롬프트 튜닝 루프와 궁합이 애매할 수 있음 → 기본은 (a) 수동 반복, `/loop`는 보조.

## 9. 시간 부족 시 최소 루프 세트 (cut 라인)

위 구조 전부가 살아있어야 루프가 도는 게 **아님**. 시간이 밀리면 아래만 남긴다:

- **필수**: `eval_set/cases` (최소 8개로 축소 가능) + `eval_run.py` + `NEXT.md`/`DECISIONS.md` 수동 갱신 — 이 3개면 "측정 기반 1변수 반복"은 성립.
- **버려도 되는 것**: `loop-iterate` 스킬(수동으로 똑같이 할 수 있음), Stop 게이트(`.loop_gate_off`), SessionStart 컨텍스트.
- **제출 후에만 필요**: `ops_check.sh` — 빌드 기간엔 신경 끄기.
- 서비스 자체의 컷 순서는 `service_design.md` §14 폴백 표가 기준 (프롬프트팩 단순화 → 프리셋 축소 → 단, "실행" 자체는 포기 불가).
