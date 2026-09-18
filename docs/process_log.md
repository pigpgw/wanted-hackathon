# Process Log — 작업 러너 (과정 기록)

> **사용법**: 의미 있는 작업이 끝날 때마다 표에 1줄씩 추가. 형식: 날짜 | 단계 | 한 것 | 근거/링크.
> 목적: (a) 제출 문서의 실측 수치 출처, (b) 본선 발표 "과정" 소스, (c) 되돌아볼 기록. `docs/loop.md`의 Remember 단계에서 여기에도 쌓는다.
> 단계 구분: RULES / RESEARCH / PROBLEM / DECISION / DESIGN / BUILD / EVAL / DEPLOY / SUBMIT / OPS

| 날짜 | 단계 | 한 것 | 근거·링크 |
|---|---|---|---|
| 2026-09-18 | RULES | 대회 룰 확정 — 자유주제, live URL 제출, 예선 내부심사80+투표20, 본선(기획력·확장성·기술력·발표). 접수마감 9/19 00:00, 제출마감 9/21 00:00, 투표 9/21~10/6, 본선 10/7~10/16, 데모데이 10/17 | `docs/contest/rules.md`, `docs/submission/submission_checklist.md` — 공식 API(`/champion-api/api/v1/contests/current`) + 프론트 번들 실측. 제출 프로젝트 548개 확인 |
| 2026-09-18 | RESEARCH | 심사위원 5인 소속사 + 파트너사 8개사 리서치 — 관심사·전략·pain point·최근 6개월 | `docs/contest/research/` 8개 파일, 출처 T1~T3 등급 |
| 2026-09-18 | PROBLEM | 문제 5개 도출(P1~P5) + sizing | `docs/discovery/problems.md`, `docs/discovery/opportunity_sizing.md` |
| 2026-09-18 | DECISION | 솔루션 후보 8개 → S2a "핏 번역기" 1차 채택(ICE 448) | `docs/discovery/decision.md`, `DECISIONS.md` |
| 2026-09-18 | DECISION | **S2a → A "업무→실행 자동화기"로 변경** — 사용자 기준(흔한 서비스 제외 + 심사위원 실제 문제). 차별성 축 추가 | `docs/discovery/decision.md`, `DECISIONS.md` |
| 2026-09-18 | RESEARCH | P1 유저 피드백 마이닝 — 한국 근로자 AI 사용 51.8%·시간 3.8%↓·매일 사용자 22%·재작업 주1~2h(31%). 대체재 4종 분석 → "실행" 갭 확인 | `docs/discovery/problems.md` P1 — fineirean.com, how-toai.com, moge.ai, qjc.app 등 |
| 2026-09-18 | DESIGN | 서비스 기획서 — LLM-as-executor, 실행 가능성 3분류, 입출력 계약, non-goals, 2일 타임라인. 스택: Next.js+Vercel+Upstage Solar(OpenAI호환) | `docs/service_design.md` |
| 2026-09-18 | DESIGN | 제출 문서 초안 4항목 + 이 로그 파일 생성 | `docs/submission/submission_draft.md` |
| 2026-09-18 | BUILD | 루프 인프라 + 스캐폴드 기초 — hooks·scripts·loop-iterate 스킬·`lib/types.ts`·`lib/presets.ts`(프리셋 3종 캐시)·eval_set 1케이스 | `.devin/`, `scripts/`, `lib/`, `eval_set/` |
| 2026-09-18 | BUILD | 리포 검수·정리 — API 계약 SoT 통일(eval_run.py↔types.ts), 프리셋 산수 오류 정정, stale S2a 제거, WP1~3 작업 패키지 정의 | `AGENTS.md`, `NEXT.md`, `DECISIONS.md` |

## 앞으로 기록할 것 (빌드 단계부터)

- BUILD: 스캐폴드, API 구현, 프롬프트 변경 — 커밋 해시 링크
- EVAL: 평가셋 실행 결과 (실행 성공률·분해 적절성·P0 건수) — 수치 그대로
- DEPLOY: 배포 URL, 배포 시각, 검증 결과
- SUBMIT: 제출 완료 시각, 제출 항목 최종본
- OPS(9/21~10/5): 매일 생존 확인 결과
