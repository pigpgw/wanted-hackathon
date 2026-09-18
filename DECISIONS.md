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
