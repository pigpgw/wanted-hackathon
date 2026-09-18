---
name: loop-iterate
description: 빌드 루프 1회 반복 — eval 실행 → triage → 1변수 수정 → 재검증 → 상태 파일 갱신
argument-hint: "[base-url, 기본 http://localhost:3000]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
triggers:
  - user
  - model
---

`docs/loop.md`의 빌드 루프를 **정확히 1회** 수행한다. 대상 서비스: 업무→실행 자동화기(`docs/service_design.md`). base-url 인자가 없으면 `http://localhost:3000`을 사용.

## 절차

1. **Discover**: `python3 scripts/eval_run.py --base-url <url>` 실행 → `eval_runs/<ts>/` 산출.
   - 로컬 서버가 안 떠 있으면 먼저 dev 서버 기동을 안내.
2. **Triage**: `eval_runs/<ts>/raw/*.json`을 읽고 오류를 분류해 `eval_runs/<ts>/triage.md` 작성:
   - **P0**: 실행 실패·빈 결과물·결과물이 "조언/지시문" 형태, 서비스 다운
   - **P1**: 분해 누락·잘못된 단계, `execution_type` 분류 오판
   - **P2**: 결과물 문체·사소한 품질
   - 각 오류에 근거(case id + raw 파일의 해당 필드 인용) 필수.
3. **Act**: P0/P1 중 **가장 영향 큰 1개만** 골라 수정 제안 → 사용자 승인 후 `edit` 1회 적용. 변수는 프롬프트/스키마/실행로직/UI 중 하나만.
   - 수정 없이 "이번 반복은 분석만"도 허용 (사용자가 선택).
4. **Verify**: 수정 적용 시에만 `eval_run.py` 재실행 → 직전 run의 `scores.json`과 delta 비교(P0 ±n, 성공률 ±%p). 악화면 revert 제안.
5. **Report**: `NEXT.md`의 "지금 진행 중/다음 행동" 갱신 + 사용자에게 2~3줄 요약 (이번 반복 결과·남은 P0 수·다음 제안).
6. **Remember**: `DECISIONS.md`에 반복 로그 append — 템플릿은 `docs/loop_setup.md` §6.

## 규칙

- **1반복 = 1변수**. 여러 개 고치고 싶으면 반복을 나눠라 — 섞으면 어느 변경이 효과였는지 소실.
- 인간 채점(분해 적절성·결과물 채택률)이 필요하면 표만 준비하고 사용자에게 요청 — 임의로 채우지 않음.
- stop condition(P0=0, 실행 성공률 ≥90%, 적절성 ≥80%) 도달하면 "동결 후보"임을 보고 — 동결 선언은 사용자가 함.
- 반복 횟수는 `NEXT.md`의 iter 카운터로 추적. cap 10회.
