# AGENTS.md — 원티드 AI Championship 2026

## 대회 요약

- 원티드랩 주최 AI 해커톤. 오픈 토픽 — AI로 실제 문제 해결 or 새 가치 창출.
- 제출 마감: **2026-09-20(일)**. 제출물: **배포된 작동 서비스 링크** + 문제 정의/AI 활용 방식/기술 스택.
- 예선: 내부 심사 80% + 투표 20% (기획력·실현가능성·확장성·AI 활용 적절성) → TOP20 → 10/17 데모데이.
- 심사 기간(9/21~10/5) 내내 서비스 링크 작동 필수.
- 상세: `docs/rules.md`, `docs/challenge.md`

## 산출물 구조

```
docs/
  rules.md              # 룰·배점·일정·심사위원·what wins
  challenge.md          # 오픈 토픽 해석·리소스 인벤토리
  research/<company>.md # 심사위원·파트너사 리서치
  problems.md           # 문제 정의 (Who/Situation/Job/Obstacle/Impact)
  opportunity_sizing.md # 기회 크기
  solutions.md          # 솔루션 후보
  decision.md           # ICE + judging fit 점수표·한 문장 결론
  measurement.md        # North Star metric
  service_design.md     # 채택 솔루션(A) 설계 — 입출력 계약·스코어링·스택·non-goals
  loop.md / loop_setup.md # 루프 정의 / 실행 설계
  process_log.md        # 작업 이력 러너 (제출 수치·발표 과정 출처)
  submission_checklist.md / submission_draft.md
  context/videos/*.md   # 영상 transcript (있을 경우)
app/                    # Next.js App Router — 단일 페이지 + /api/decompose + /api/execute
lib/                    # types.ts(API 계약 SoT) · presets.ts(데모 프리셋 캐시) · llm.ts 등
eval_set/cases/<id>/    # 평가셋 — description.txt + sample.* + expected.json (규격: eval_set/README.md)
eval_runs/<ts>/         # 평가 실행 기록 — raw/ + scores.json/md + triage.md (커밋 대상, 과정 증거)
scripts/                # eval_run.py · ops_check.sh · loop_context.sh · loop_gate.sh
.devin/                 # hooks.v1.json · skills/loop-iterate/
.agents/skills/         # work-hack-eval 스킬
NEXT.md, DECISIONS.md   # 루프 상태 파일
hackathon_builder_workflow.md
```

## 문서 관리 기준 (single source of truth)

| 정보 | SoT | 규칙 |
|---|---|---|
| API 계약 | `lib/types.ts` + `service_design.md` §4 | 바꾸면 `scripts/eval_run.py`·`scripts/ops_check.sh`를 **같은 커밋**에서 동기화 |
| 서비스 스펙 | `docs/service_design.md` | 변경 시 DECISIONS.md에 이유 기록 |
| 진행 상태·다음 작업 패키지 | `NEXT.md` | 세션 시작 시 여기부터 읽기 |
| 결정 로그 | `DECISIONS.md` | 날짜—결정—이유 형식 |
| 작업 이력·수치 | `docs/process_log.md` | 제출 문서 수치의 출처 |
| 평가셋 규격 | `eval_set/README.md` | 케이스 추가 시 이 규격 준수 |

- 문서 간 같은 내용 복제 금지 — 참조는 경로 링크로.
- 상태 파일(NEXT.md·DECISIONS.md)은 작업 끝낼 때마다 갱신 — 다른 세션이 이어받는 유일한 메모리.

## 작업 컨벤션

- **스코프 원칙 (최우선)**: "모든 걸 만들기" 금지 — 2일 내 1인이 완성 가능한 것만. 새 기능·도구·문서를 추가하기 전에 "이게 핵심 플로우 1개의 완성이나 stop condition에 기여하는가"를 먼저 묻는다. 기여 못하면 백로그. 인프라(스크립트·스킬·훅)도 동일 기준: 반복 비용을 실제로 줄이는 것만 유지.
- **병렬 세션 소유권**: NEXT.md의 작업 패키지(WP)별 파일 소유권을 따른다. 소유권 밖 파일을 건드려야 하면 작업 전 NEXT.md에 먼저 기록 — 조용한 교차 수정 금지.
- 모든 사실 주장에 출처 URL + evidence tier (T1 공식, T2 언론·리포트, T3 커뮤니티·추정) 표기.
- 리서치 완료 전 구현 코드 작성 금지 — **Phase A 완료로 해제됨** (2026-09-18, A 채택).
- 커밋: conventional commits, docs 변경은 `docs:` prefix.
- 서비스는 2주 무료 티어 생존 가능 스택 (정적 호스팅 + 서버리스 + 관리형 LLM API) 우선.
- 비밀값(`.env*`)은 절대 커밋하지 않음 — `.env.example`에 키 이름만.

## 검증 명령

- 문서 작업: `docs/` 내 모든 링크가 열리는지 확인 (curl 또는 webfetch).
- 코드 작업: `npm run build` 통과 + `python3 scripts/eval_run.py` (dev 서버 기동 후) — loop_gate 훅이 eval 미실행 stop을 차단.
- 배포 후: `curl -I <url>` 200 확인 + `./scripts/ops_check.sh <url>` + 핵심 플로우 수동 검증.
