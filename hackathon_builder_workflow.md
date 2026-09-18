# Hackathon Builder Workflow — 원티드 AI Championship 2026

> 이 문서는 이 대회(자유 주제 + live 서비스 URL 제출 + 온라인 투표 + 본선 데모데이)에 맞게 재작성됨.
> 과거 버전은 "기업이 낸 문제 중 선택" 구조 대회용이었음 — 이 대회는 문제를 **우리가 발굴**한다.

---

## 0. 전체 흐름

```
Phase A (Context):  Rules → Problem Discovery → Agent Setup → Research(what wins 지도)
                    → Problem Statement → Sizing → Solutioning → Prioritization → Measurement
Phase B (Build):    구현 → 배포 → 제출 문서 → 제출 (9/20 마감)
Phase C (운영):     서비스 생존 모니터링 + 투표 대응 (9/21~10/5)
Phase D (본선):     TOP20 시 데모데이 발표 준비 (~10/17)
```

핵심 원칙: **"Context first, code later"** — 단, 이번 대회는 제출까지 ~2일이라 Phase A는 이미 완료, Phase B가 지배적.

---

## 1. Hackathon Rules 파악 — 완료 ✅

- 산출물: `docs/contest/rules.md`, `docs/submission/submission_checklist.md`
- 이 대회의 구조적 특징:
  - **자유 주제** — 출제 문제 없음. "AI로 실제 문제 해결 or 새 가치 창출"이 전부
  - **제출물 = live 서비스 URL** — 데모 영상/레포가 아님. 심사 기간(9/21~10/5) 접속 불가 시 심사 제외
  - **예선 = 내부 심사 80% + 온라인 투표 20%** — 투표가 실제 점수. 인기상은 투표 100%, 예선 득표 누적
  - **본선 = 발표 평가 포함** — 기획력·확장성·기술력·발표 전달력. 오프라인 참석 필수(불참 시 수상 제외)
  - **폼 필수 항목**: 문제 정의 / AI 활용 방식+결과 / AI툴·스택(1개+) / 서비스 링크 / 스크린샷(1~5장, 16:9) / 홍보 동의
- "what wins" 가설: 작동하는 서비스가 절대 조건 + 문제 정의 명확성 + 심사위원 관심사와의 공명

## 2. Problem Discovery — 완료 ✅ (자유 주제이므로 "파악"이 아니라 "발굴")

- 이 대회는 challenge statement가 없으므로, `docs/contest/challenge.md`는 **오픈 토픽 해석 + 제공 리소스 인벤토리(없음 확인)** 로 대체.
- 문제 후보의 소스 (우리가 발굴):
  1. 심사위원·파트너사 관심사 맵과 공명하는 실제 문제
  2. 투표자(=원티드 사용자·구직자일 확률 높음)가 자기 문제로 느낄 문제
  3. 2일 내 live 서비스로 증명 가능한 문제
- 산출물: `docs/discovery/problems.md` — Who/Situation/Job/Obstacle/Impact + 5 Whys + "받은 문제 vs 실제 문제"

## 3. Agent Setup — 완료 ✅

- `AGENTS.md` — 대회 요약, 산출물 구조, 컨벤션(evidence tier, 리서치 전 구현 금지 등), 검증 명령
- `.agents/skills/work-hack-eval/SKILL.md` — 평가셋 채점 스킬
- `NEXT.md`, `DECISIONS.md` — 루프 상태 파일
- YouTube 등 영상은 transcript 추출 후 `docs/context/videos/*.md`로 저장 (링크만으로는 못 읽음) — 심사위원 김덕중 강연 영상(`research/firb.md` 참조)이 후보
- (다른 툴 환경에서 이 워크플로우를 재사용할 경우: Codex면 AGENTS.md+plugin, lazyCodex `ulw-research` 등이 같은 역할 — 경로만 치환)

## 4. Research → "What Wins" 지도 — 완료 ✅

- **목적 재정의**: 이 대회에서 회사 리서치는 "출제 문제 이해"가 아니라 **심사 가중치의 숨은 지도**. 심사위원의 소속사·직함·공개 발언이 곧 평가의 숨은 가중치.
- 수집한 것: 심사위원 5인 소속사(원티드랩·라이너·퍼브·크래프톤·스파크랩) + 파트너사(업스테이지·채널코프·셀렉트스타) — `docs/contest/research/<company>.md` 8개
- 각 파일: History / Business model / Current strategy / Pain points / Recent moves(6개월) / Sources(T1·T2·T3 등급) + **심사 관점 추정**
- 합성 결과: 전원이 "에이전트가 실제 업무를 끝까지 처리" + "직장인/1인 업무 자동화" + "출처·검증·평가"에 수렴

## 5~9. Problem Statement → Measurement — 완료 ✅

- `docs/discovery/problems.md` (P1~P5 + 유저 피드백·대체재 분석), `docs/discovery/opportunity_sizing.md`, `docs/discovery/solutions.md`, `docs/discovery/decision.md` (ICE + judging fit + 차별성 → **A "업무→실행 자동화기" 채택**), `docs/measurement.md` (North Star: 1회 실행으로 절감된 업무 시간)
- 결론: "직장인이 '자기 업무 중 뭘 자동화할지' 분해·판단할 도구가 없는 문제를, 업무 서술→단계 분해→자동화 우선순위→샘플 데이터 실제 1회 실행까지 해주는 에이전트로 푼다. 데모 scope = 핵심 플로우 1개."

## 10. Loop Engineering — 완료 ✅ + 운영 버전 추가

- `docs/loop.md` — Discover→Triage→Act→Verify→Report→Remember, stop condition, iteration cap, 상태 파일
- 이 대회 특화 루프 2개:
  - **빌드 루프(지금~9/20)**: 평가셋 실행 → 오류 분류(P0 근거없는매핑/P1 추출누락/P2 문체) → 1변수 수정 → 재실행. cap 10회
  - **운영 루프(9/21~10/5)**: 매일 1회 `curl -I` 생존 확인 + 실행 시도 수·실행 성공률·결과물 채택률 수집 → P0 장애만 대응, 기능 변경 없음(안정성 우선). 스케줄 자동화 제안 대상

## 11. Build & Submit — 🔲 지금 여기

- [ ] 스택 결정: **2주 무료 생존** 기준 — 정적 프론트 + 서버리스 백엔드 + 관리형 LLM API (cold start·rate limit·비용 상한 고려)
- [ ] 핵심 플로우 1개 구현: 업무 서술 입력 → 분해 맵+자동화 점수 → 단계 선택 → 샘플 실행 결과물 + before/after (`docs/service_design.md` §3)
- [ ] 스크린샷 1~5장 16:9 준비
- [ ] 제출 폼 문구 작성 — `docs/submission/submission_checklist.md` §1 전 항목
- [ ] **제출 버튼(임시저장 아님)** — 팀장 계정, 9/20 마감, 마감 전 수정 가능

## 12. 심사 기간 운영 — 🔲 9/21~10/5

- [ ] 서비스 생존 확인 (운영 루프, 자동화 권장)
- [ ] 투표 대응: 제출작 공개(9/21~) 후 공유·홍보 — 과제당 1회 투표, 예선 득표가 인기상에도 누적이므로 초반이 중요
- [ ] 기능 변경 동결 — 안정성이 최우선

## 13. 본선 대비 — 🔲 TOP20 발표(10/7) 후

- [ ] 오프라인 데모데이(10/17) 참석 필수 — 불참 시 수상 제외
- [ ] 발표 구성: `docs/` 산출물이 그대로 골격 (문제 정의 → 기회 → 솔루션 → 지표 → 데모)
- [ ] 평가축 대응: 기획력(problems·decision), 확장성(sizing·생태계 스토리), 기술력(에이전트 파이프라인·평가셋), 발표 전달력(연습)

---

## 핵심 체크리스트 (항상 열어두기)

- [ ] `docs/submission/submission_checklist.md` — 폼 필수 항목·파일 규격·약관·투표 규칙 전체
- [ ] 접수 완료 여부 (9/19 00:00 마감)
- [ ] 제출 완료 여부 (9/21 00:00 마감, 임시저장 아님)
- [ ] 서비스 URL 9/21~10/5 접속 유지
- [ ] 본선 진출 시 오프라인 참석 가능 여부
