# DECISIONS.md — 결정 로그

형식: 날짜 — 결정 — 이유. 되돌릴 때 근거가 남도록.
빌드 루프 반복 로그 템플릿은 `docs/loop_setup.md` §6.

## 2026-09-18

- **S2a "핏 번역기" 채택 → (같은 날) A "업무→실행 자동화기"로 변경**
  - 변경 이유: 사용자 기준 추가 — "이미 인터넷에 많이 있는 서비스면 안 되고, 심사위원·회사가 실제 고민하는 문제여야 함". 자소서·이력서 AI는 범람 → 차별성 게이트 탈락. A는 심사위원 5인 화두 전원(자기 업무 해킹·AX 실전·업무 자동화·AI 팀원·실행하는 에이전트)과 일치.
  - 검증 근거: 유저 피드백 마이닝으로 P1 문제 실재 확인 (한국 근로자 51.8% AI 사용·업무시간 3.8% 감소·매일 사용자 22% — 표면적 사용). 대체재 분석으로 "실행" 갭 확인 (Panorama·Performi·Zapier Copilot·QJC 전부 추천/분석/컨설팅까지만 — 개인이 자연어 서술→분해→실행하는 제품 없음). 상세: `docs/discovery/problems.md` P1, `docs/discovery/decision.md`
  - 스코프 고정: "실행"은 샘플 데이터 1회 실제 처리로 한정 (전체 자동화 파이프라인 아님) — 2일 내 완결성 확보.
- 데모 scope: 업무 서술 입력 → 분해 맵 + 자동화 점수 → 1개 선택 → 샘플 실행 결과물 + before/after, 단일 플로우 1개.
- ~~S2a 채택 (폐기)~~ — ICE 448 최고였으나 "흔한 서비스" 기준으로 사용자가 기각.
- **루프 엔지니어링 실행 설계 확정**
  - 내용: `docs/loop_setup.md` — `/loop`·hooks·skills·`devin -p`에 루프 단계 매핑. `.devin/hooks.v1.json`(SessionStart 컨텍스트 주입 + Stop 게이트), `scripts/` 4종, `.devin/skills/loop-iterate`, `eval_set/` 스켈레톤 생성.
  - 이유: 추상 루프(`docs/loop.md`)만으로는 매 반복 강제 장치가 없어 "감으로 튜닝"으로 퇴화할 위험.
- **API 계약 SoT 확정 + 리포 검수·정리**
  - 계약: `/api/execute` 입력은 `ExecuteInput`(`{step, task_title, sample_data, sample_filename}`) — `lib/types.ts`가 source of truth. `scripts/eval_run.py` 요청을 여기에 맞춤 + `service_design.md` §4에 입력 계약 명시 + "계약 변경 시 같은 커밋 동기화" 규칙 추가.
  - 이유: 병렬 세션 투입 전 계약 불일치(eval_run.py가 다른 필드 전송)를 제거 — 안 맞추면 세션마다 다른 계약으로 구현.
  - 버그 수정: `lib/presets.ts` canonical 데모 집계 산수 오류(online 961,000→1,061,000 기재, 합계·비중·SKU-101 오류) → 실측값으로 정정.
  - 정리: `hackathon_builder_workflow.md` stale S2a 2곳, `AGENTS.md` 빌드 단계 구조·문서 SoT 표·병렬 세션 소유권 규칙, `NEXT.md` 작업 패키지(WP1~3) 정의, `.env.example` 추가.
- **병렬 작업 방식 확정**: 새 세션들을 NEXT.md의 WP 단위로 투입 — 파일 소유권으로 충돌 방지. 오케스트레이터(메인 세션)가 통합·검수·배포.
- **오케스트레이션 메커니즘 실측 확정 — tmux 미도입**
  - 읽기: `~/.local/share/devin/cli/transcripts/<id>.json`에 전체 대화 원문 존재 (실측) + `devin list --format json`으로 세션 목록.
  - 쓰기: `devin -r <id> -p "지시"` 실측 성공 — 단 **닫힌 세션만**. 열려있는 세션은 프로세스 lock으로 `failed to start ACP agent session` (실측).
  - tmux 보류 이유: 추가 능력은 `send-keys`로 열린 세션에 실시간 주입뿐 — 워커 승인 프롬프트 때문에 실시간 자동화는 어차피 취약. `-p` 원샷 + `-r -p` 후속 지시 + NEXT.md 파일 조율로 충분. 정규 API 경로는 `devin acp`(JSON-RPC) — 필요 시 검토.
  - 절차: `NEXT.md` 오케스트레이션 섹션 (세션 레지스트리 포함).
- **오케스트레이션 단순화 — 검증된 경로만 유지** (같은 날 정정)
  - 제거: 자율 `devin -p` 원샷 워커 모드 — 미검증 + 권한 함정(exec 필요 작업은 accept-edits 부족, smart 계정별 미보장, bypass 위험). 기동은 대화형 탭으로 통일 — 승인도 사용자가 그 자리에서 처리.
  - 제거: 워커의 NEXT.md 자기 행 갱신 — 미보고·동시 쓰기 위험. NEXT.md는 오케스트레이터 단독 기록, 워커는 읽기 전용 + git 커밋 금지.
  - 유지: transcripts 검수, `-r -p` 주입(닫힌 세션), WP2는 메인 세션 subagent (lock·권한 문제 없음).
- **`/api/execute` 프리셋 캐시에 sample_data 일치 조건 추가** (WP2 검수 중 오케스트레이터 수정)
  - 문제: `task_title`+`step.id`만 매칭 → 프리셋 서술로 **다른 데이터**를 보내도 통조림 결과 반환. 심사위원이 자기 CSV를 올리면 데이터와 무관한 결과가 나와 들통남.
  - 수정: `task_title`+`step.id`+`sample_data` 3개 모두 일치할 때만 캐시. 비매칭은 엔진 경로 (키 있으면 실실행, 없으면 mock).
- **iter0 = mock 모드 스모크, 품질 수치 아님** — `LLM_API_KEY` 미설정 상태 `eval_run.py` 실행: decompose 13/13·exec 13/13·P0 0·분류일치 9/13. mock이 모든 입력에 동일 단계를 반환하므로 경계 케이스(09~12) 불일치는 구조상 당연 — 파이프라인 검증으로만 기록, 품질 측정은 키 설정 후 iter1부터.
- **iter1→2 (빌드 루프 실측 시작)**
  - iter1 (gemini-3.5-flash): exec 81.8%·P0 2·decompose 11/13. Triage 결과 실패 4건 전부 **Gemini 무료 티어 429** (20 RPM) — 코드·프롬프트 문제 아님.
  - 변수1 — 재시도 정책: 즉시 1회 → **429 응답의 `retry in Ns` 파싱 적응 대기** (총 대기 ≤50s, `maxDuration` 60 유지). 두 라우트 동일 적용.
  - 변수2 — 모델 교체: 3.5-flash 지속 429·503 포화 → **gemini-3.1-flash-lite** (별도 쿼터 버킷). 참고: 3.6/3.8-flash도 현재 포화·신규 차단.
  - iter2 결과: **exec 100%·P0 0·decompose 13/13**. 남은 것 = 경계 09~12 분류 불일치 (실행 불가를 executable로 과대포장) → 다음 반복은 decompose 프롬프트의 정직한 분류 강화 후보.
- **iter3→4 (분해 프롬프트 정직화) — 4/10에서 동결 후보 선언**
  - iter3 변수: DECOMPOSE_SYSTEM에 "executable은 결과물 자체가 데이터 변환일 때만 + 보조 산출물 위해 단계 지어내지 말 것 + executable 없으면 rec를 핵심 병목에" 추가. 결과: 분류일치 9→10 (09·11 수정), 부작용 = 07 뉴스레터 과보수 회귀.
  - iter4 변수: "문서·초안·표 등 텍스트 아티팩트가 업무 산출물이면 executable / 결정·판단이 산출물이면 아님" 추가. 결과: 07 회복, 11 재불일치 → 분류일치 10 유지.
  - **동결 판단 근거** (사용자 위임): ① stop 2/3 명목 충족(P0=0·exec 100%), 셋째는 인간 채점 지표. ② 잔여 불일치 정밀 분석 — 10은 추천 단계가 이미 정직(human_judgment), 11은 "보고서 작성"이 규칙상 정당한 문서 산출물, 12만 진짜 논쟁 대상. ③ `executable_at_least_one` 이진 metric은 "보조 executable 허용+추천 정직"을 구분 못 함 — metric 한계를 제품 품질 저하로 메우지 않기로 결정. ④ 07↔11 진동 관측 — 추가 튜닝은 회귀 위험이 실질 이득보다 큼.
  - 향후: Solar/유료 키 확보 시 더 강한 모델로 재측정 가치 있음 — lite 모델 한계일 수 있음.
