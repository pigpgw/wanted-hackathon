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
| 2026-09-19 | DEPLOY | 프로덕션 모델 `gpt-4o-mini` 확정 — 로컬 eval 13케이스 재측정: decompose 13/13·exec 100%·P0 0·분류일치 10/13 (동결 수치와 동일). Vercel CLI 배포 → https://wanted-hackathon.vercel.app , ops_check status=200 latency=0.07s canonical=ok, 프리셋 분해→실행(28초)·직접 입력 decompose 실측 정상 | `scripts/ops_check.sh` + 프로덕션 curl 검증 |
| 2026-09-19 | BUILD | 토스 디자인 전면 리디자인 + 모바일 대응 — #3182F6 토큰·플랫 카드·채움 배지·그레이 입력, 그라데이션/dot-grid 제거 | `app/globals.css`, `components/automation-app.tsx` — tsc·build 통과 |
| 2026-09-19 | BUILD | v2 4종 구현 — ①`output_format` 양식 채움(캐시 우회) ②**코드 재계산 검증 카드**(`lib/verify.ts` — 그룹 집계 대조, 불일치 시 재계산값 제시) ③`/api/revise` 자연어 수정+재검증 ④레시피 링크(URL `#r=` fragment, stateless 유지). 프리셋 3종에 검증 카드 콘텐츠 추가 | `lib/types.ts`·`engine.ts`·`verify.ts`, `app/api/revise/`, `automation-app.tsx` — tsc·build 통과 |
| 2026-09-19 | EVAL | v2 실측 — 양식 채움: 사용자 표 양식 그대로 채움 확인. **검증 카드 실효성 실증**: gpt-4o-mini가 합계 1,686,000(정답 1,886,000)으로 오계산 + 자기 LLM 검증은 "3건 일치" 거짓 승인 → 코드 재계산이 3건 전부 "확인 필요"+정답값 제시. 수정 요청 후 재검증 "3건 일치" 확인. 캐시 경로(cached:true)·레시피 인코딩 왕복 정상 | 로컬 curl — `app/api/execute`·`revise` 실측 |
| 2026-09-19 | DEPLOY | v2 프로덕션 배포 (`vercel deploy --prod`, commit `ae58d59`) — `/api/revise` 라우트 포함 전 경로 확인: 캐시 실행(검증 5건 일치)·양식 채움 실행(코드 검증이 1,430,000 오계산 적발→정답 1,886,000 제시)·revise(수정+재검증)·ops_check status=200 latency=0.46s | https://wanted-hackathon.vercel.app 프로덕션 curl 실측 |
| 2026-09-19 | BUILD | 비개발자 UX·출력 양식 패스 — ①TSV/세미콜론 구분자 감지(`lib/verify.ts` detectDelimiter)로 엑셀 복붙도 코드 검증 ②내보내기 4종(복사/.md/엑셀CSV-BOM/PDF-인쇄, `@media print`가 `#print-area`만 출력) ③첫 방문 사용법 카드+「사용법」버튼(sessionStorage 플래그, joyride 대신 자체 구현) ④실행·분해 중 단계 안내 문구 순환 ⑤분해 실패 "예시로 체험" 탈출 버튼. .xlsx/.pptx 네이티브는 non-goal(§9) | `lib/verify.ts`, `components/automation-app.tsx`, `app/globals.css`, `docs/service_design.md` — tsc·build 통과 |
| 2026-09-19 | DEPLOY | UX 패스 프로덕션 배포 (`vercel deploy --prod`, commit `56c11ed`) — ops_check status=200. 배포 후 실측에서 **코드 검증 우회 버그 발견**: LLM이 쌩숫자(152000)로 출력하면 extractNumbers가 콤마 숫자만 잡아 추출 0건→LLM 카드 폴백. `635d1aa`로 쌩숫자 추출(날짜·코드 경계 제외)+원문 셀 유도+정수 정확일치 수정 후 재배포 — 프로덕션 TSV 입력→source:code·오계산(480,000→정답 482,000) 적발 확인 | `lib/verify.ts` + 프로덕션 curl 실측 |
| 2026-09-19 | BUILD | 첫 방문 온보딩을 react-joyride로 교체 (사용자 명시 요구) — Joyride v3 투어 +「사용법」버튼 key-remount 재시작, sessionStorage 세션 1회, 토스 블루·한글 locale | `components/automation-app.tsx`, `package.json` (react-joyride ^3.2.0) — tsc·build 통과, 번들 +26kB |
| 2026-09-19 | BUILD | 투어를 "보여주기"→"실제 구동"으로 전환 (사용자 지시) — Joyride 스텝별 `before` 훅이 실제 액션 수행: 예시 채우기(applyPreset)→분해(runDecompose)→추천 선택(selectStep)→실행(runExecute). 최신 상태는 tourApi/tourSnap ref로 읽어 stale 클로저 방지, 진행 상태 가드로 중복 방지, `error:target_not_found` 시 투어 종료+에러박스 위임. 데스크톱+모바일 캡처로 전 구간 검증, 콘솔 에러 0 | `components/automation-app.tsx` — 투어 8스텝, Playwright 캡처 검증 |
| 2026-09-19 | BUILD | 토스 디자인 전면 개편 + TDS 공식 팔레트 전수 대조 — 레이아웃(#f2f4f6 배경·720px 컬럼·카드 24px)·타이포 계층·리스트 셀 단계 카드·비활성 회색. 공식 팔레트 외 커스텀 색 10종을 정확한 값으로 통일 (blue50 `#e8f3ff`·blue100 `#c9e2ff`·green700 `#029359`·green50 `#f0faf6`·orange800 `#ed6700`·yellow50 `#fff9e7`·red50 `#ffeeee`) | `app/globals.css`, `components/automation-app.tsx`, `components/ui/button.tsx` — TDS 문서 대조 + 스크린샷 검증 |
| 2026-09-19 | DEPLOY | 인터랙티브 투어+TDS 팔레트 프로덕션 배포 (commit `d471b08`·`faf978e`) — 프로덕션에서 투어가 프리셋 채우기+분해(4단계) 실구동 확인, ops_check 200 | https://wanted-hackathon.vercel.app 프로덕션 실측 |
| 2026-09-19 | SUBMIT | 제출 자산 완성 — 16:9 스크린샷 6장(대표이미지+5) 생성(`~/Desktop/wanted-screenshots/`, 2560×1440·~150KB), 제출 폼 실측(필드 확정: 대표이미지·제목·문제 한줄·AI활용 500자 제한·스택 칩·링크·스크린샷≤5) → 필드별 확정 텍스트 작성(문제 한 문장·AI활용 425자 — 제작 루프 엔지니어링+서비스 3단계 추론). 제출 버튼은 사용자가 직접 | `~/Desktop/wanted-submission.md`, `docs/submission/submission_draft.md` |
| 2026-09-19 | BUILD | 코드-문서 전수 동기화 패스 — ①`.tsv` 파일이 `accept`엔 있으나 업로드 검증에서 거부되던 버그 수정(확장자 허용+행 cap 적용) ②`engine.ts` 기본 모델을 문서화된 프로덕션 설정(gpt-4o-mini/OpenAI)과 정합 — env 미설정 클론 환경도 동일 기본값 ③service_design §4에 `verification.source` 필드·100행 정합 반영 | `components/automation-app.tsx`, `lib/engine.ts`, `docs/service_design.md` |
