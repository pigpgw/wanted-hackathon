# Process Log — 작업 러너 (과정 기록)

> **사용법**: 의미 있는 작업이 끝날 때마다 표에 1줄씩 추가. 형식: 날짜 | 단계 | 한 것 | 근거/링크.
> 목적: (a) 제출 문서의 실측 수치 출처, (b) 본선 발표 "과정" 소스, (c) 되돌아볼 기록.
> 단계 구분: RULES / RESEARCH / PROBLEM / DECISION / DESIGN / BUILD / EVAL / DEPLOY / SUBMIT / OPS

| 날짜 | 단계 | 한 것 | 근거·링크 |
|---|---|---|---|
| 2026-09-18 | RULES | 대회 룰 확정 — 자유주제, live URL 제출, 예선 내부심사80+투표20, 본선(기획력·확장성·기술력·발표). 접수마감 9/19 00:00, 제출마감 9/21 00:00, 투표 9/21~10/6, 본선 10/7~10/16, 데모데이 10/17 | `docs/contest/rules.md`, `docs/submission/submission_checklist.md` — 공식 API(`/champion-api/api/v1/contests/current`) + 프론트 번들 실측. 제출 프로젝트 548개 확인 |
| 2026-09-18 | RESEARCH | 심사위원 5인 소속사 + 파트너사 8개사 리서치 — 관심사·전략·pain point | 요약은 `docs/discovery/decision.md` 근거 1 (원문 리서치 파일은 2026-09-19 정리 시 제거) |
| 2026-09-18 | PROBLEM | 문제 5개 도출(P1~P5) + sizing | `docs/discovery/problems.md` |
| 2026-09-18 | DECISION | 솔루션 후보 8개 → S2a "핏 번역기" 1차 채택(ICE 448) | `docs/discovery/decision.md`, `DECISIONS.md` |
| 2026-09-18 | DECISION | **S2a → A "업무→실행 자동화기"로 변경** — 사용자 기준(흔한 서비스 제외 + 심사위원 실제 문제). 차별성 축 추가 | `docs/discovery/decision.md`, `DECISIONS.md` |
| 2026-09-18 | RESEARCH | P1 유저 피드백 마이닝 — 한국 근로자 AI 사용 51.8%·시간 3.8%↓·매일 사용자 22%·재작업 주1~2h(31%). 대체재 4종 분석 → "실행" 갭 확인 | `docs/discovery/problems.md` P1 — fineirean.com, how-toai.com, moge.ai, qjc.app 등 |
| 2026-09-18 | DESIGN | 서비스 기획서 — LLM-as-executor, 실행 가능성 3분류, 입출력 계약, non-goals, 2일 타임라인. 스택: Next.js+Vercel+Upstage Solar(OpenAI호환) | `docs/service_design.md` |
| 2026-09-18 | DESIGN | 제출 문서 초안 4항목 + 이 로그 파일 생성 | `docs/submission/submission_draft.md` |
| 2026-09-18 | BUILD | 스캐폴드 기초 — eval 스크립트·`lib/types.ts`·`lib/presets.ts`(프리셋 3종 캐시)·eval_set 1케이스 | `scripts/`, `lib/`, `eval_set/` |
| 2026-09-18 | BUILD | 리포 검수·정리 — API 계약 SoT 통일(eval_run.py↔types.ts), 프리셋 산수 오류 정정, stale S2a 제거, WP1~3 작업 패키지 정의 | `AGENTS.md`, `NEXT.md`, `DECISIONS.md` |
| 2026-09-18 | BUILD | WP1 eval_set 확충 — 13케이스(정리·보고·변환 8 + 경계 5), 구조·expected.json 검증 통과, 프리셋과 불중복 | `eval_set/cases/` |
| 2026-09-18 | BUILD | WP2 서비스 구현 — app/(3단계 UI + /api/decompose·execute·presets), Tailwind+shadcn, 프리셋 캐시·재시도·폴백. build 통과 + curl 계약 검증 | `app/`, `components/` — 오케스트레이터 검수로 execute 캐시 sample_data 일치 조건 추가 |
| 2026-09-18 | EVAL | iter0 스모크 (mock 모드, 키 미설정): decompose 13/13·exec 13/13·P0 0·분류일치 9/13 — 파이프라인 검증용, 품질 수치 아님 | `eval_runs/2026-09-18T180855/` |
| 2026-09-18 | EVAL | iter1 실측 (gemini-3.5-flash): exec 81.8%·P0 2 — 실패 전부 무료 티어 429 (20 RPM). 재시도를 429 retryDelay 적응 대기로 수정 | `eval_runs/2026-09-18T211345/` |
| 2026-09-18 | EVAL | iter2 (gemini-3.1-flash-lite로 교체 — 3.5 포화): **exec 100%·P0 0·decompose 13/13**·분류일치 9/13. 잔여 = 경계 케이스 executable 과대포장 | `eval_runs/2026-09-18T212937/` |
| 2026-09-18 | EVAL | iter3 (분해 프롬프트 정직화): 분류일치 9→10·exec 100% 유지. 09·11 정직화, 07 과보수 회귀 | `eval_runs/2026-09-18T213419/` |
| 2026-09-18 | EVAL | iter4 (산출물 유형 기준): 07 회복·분류일치 10/13 수렴. **동결 후보** — 잔여 3건은 metric 한계·논쟁 케이스, raw상 추천은 정직 | `eval_runs/2026-09-18T214048/` |
| 2026-09-19 | BUILD | 해커톤 경쟁력 패스 — 디자인(Pretendard·인디오/퍼플·히어로) + 기능(붙여넣기·연간 절감·복사/다운로드·OG/favicon) + 제출 초안 실측 수치 반영 | `app/globals.css`, `app/layout.tsx`, `app/icon.svg`, `components/automation-app.tsx`, `docs/submission/submission_draft.md` — build·ops_check 통과 |
| 2026-09-19 | DEPLOY | Vercel 프로덕션 배포 — https://wanted-hackathon.vercel.app/ · ops_check 200·canonical ok · 프리셋 분해→실행 전 경로 검증 (실행 28초) | `scripts/ops_check.sh` 출력, 프로덕션 curl 검증 |
