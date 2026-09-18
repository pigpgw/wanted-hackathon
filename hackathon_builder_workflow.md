# Hackathon Builder Workflow (검증·보완 버전)

> 원본 메모의 10단계 구조는 PM/빌더 표준 프로세스(Problem Framing → Sizing → Solutioning → Prioritization → Measurement → Loop)와 거의 일치합니다. 아래는 각 단계에 대해 조사한 실제 도구/프레임워크를 붙여 보완한 것입니다. `[출처]`는 문서 끝에 정리.

---

## 0. 전체 흐름 한눈에 보기

```
Rules → Problem → Codex Setup → Research/Context → Problem Statement
→ Opportunity Sizing → Solutioning → Prioritization → Measurement Plan → Loop Engineering
```

핵심 원칙: **"Context first, code later."** 1~6단계가 전체 시간의 40~50%를 차지해도 정상입니다.

---

## 1. Hackathon Rules 파악

- 확인 항목: 평가 기준(judging criteria)과 **배점 비율**, 제출물 형식(demo video / repo / pitch deck), 마감, 팀 규모, 허용 도구/모델, IP·라이선스 조건, 스폰서 트랙(sponsor track)별 특별 상.
- 산출물: `docs/rules.md` — 평가 항목별 배점표 + "what wins" 가설 1~2줄.
- 팁: 심사위원(judges) 프로필도 함께 조사. 심사위원의 배경이 곧 평가 기준의 숨은 가중치입니다.

## 2. Problem 파악

- 출제 문제(prompt/challenge statement)를 **원문 그대로** 저장하고, 출제 의도를 별도 한 문단으로 해석해 적습니다.
- 출제자(스폰서 기업/기관)가 제공한 영상·데이터셋·API 목록을 인벤토리로 정리.
- 산출물: `docs/challenge.md`

## 3. Codex Initial Setup

### 3.1 Context 주입
- `AGENTS.md`에 해커톤 rules 요약, challenge, 팀 규칙(브랜치 컨벤션, 커밋 스타일, 검증 명령)을 넣습니다. Codex는 작업 시작 전에 `~/.codex/AGENTS.md`(global) → 프로젝트 루트 → 하위 디렉터리 순으로 `AGENTS.md`를 읽어 합칩니다. 기본 상한 32KiB이므로 길어지면 하위 디렉터리로 분산. [1]
- YouTube 영상 링크는 링크만 던지면 Codex가 못 봅니다. **transcript를 텍스트로 추출**(NotebookLM에 YouTube 소스 추가 → 요약, 또는 `yt-dlp --write-auto-sub`)해서 `docs/context/videos/*.md`로 저장 후 참조시키는 것이 정확합니다.

### 3.2 Codex plugin scaffolding
- Codex 내장 `@plugin-creator` skill이 `.codex-plugin/plugin.json` manifest와 로컬 marketplace 엔트리를 생성해 줍니다. 구조: [2]
  ```
  my-plugin/
  ├── .codex-plugin/plugin.json
  ├── .mcp.json      # MCP 서버 연결
  ├── .app.json
  ├── skills/        # SKILL.md 단위 스킬
  ├── hooks/
  ├── scripts/
  └── assets/
  ```
- 해커톤용 권장: 리서치 단계에서 필요한 스킬을 `skills/`로 먼저 만들고(e.g. `research-company`, `size-opportunity`), README와 AGENTS.md 초안을 Codex에게 작성시킴.
- 참고 옵션: `codex --search`(웹 검색 활성화), `--enable collab`(서브에이전트 `spawn`). 무권한 `--yolo`는 주의. [3]

### 3.3 Harness 선택 (lazyCodex를 쓰는 이유)
- **LazyCodex** = Sisyphus Labs의 OmO agent harness를 Codex에 설치하는 도구(`npx lazycodex-ai install`). 제공 기능: project memory, `$ulw-plan`(decision-complete 계획), `$ulw-loop`(검증될 때까지 반복), `ulw-research`(코드베이스·웹·공식문서·OSS를 병렬 explorer/librarian 에이전트로 조사, 인용 포함 synthesis). [4][5]
- 즉 "codex + insane_search"에서 lazyCodex를 쓰는 이유는 **병렬 리서치 스웜 + 인용 기반 합성 + 검증 루프**가 기본 탑재되기 때문입니다.

## 4. Research → Context Building

### 4.1 도구
- **NotebookLM**: 공식 PDF, IR 자료, 영상 URL, 기사 URL을 소스로 넣고 source-grounded Q&A. 환각이 적고 인용이 남아서 **1차 사실 확인용**으로 적합.
- **Codex + insane-search**: `codex-insane-search`는 차단된 웹/로그인 벽 뒤 콘텐츠에 접근하기 위한 Codex 플러그인(공개 엔드포인트 → Jina reader fallback → 브라우저 에스컬레이션 순으로 시도). [6] 일반 웹 검색으로 안 잡히는 커뮤니티 글, 리뷰, 포럼 수집에 사용.
- LazyCodex `ulw-research`: 위 두 가지를 오케스트레이션해서 리포트로 합성.

### 4.2 수집 대상 (우선순위 순)
1. **1차 공식 자료**: 출제 기관/기업 홈페이지, 보도자료, IR/annual report, 공식 블로그, 채용 공고(→ 현재 투자 중인 문제 영역이 드러남), 공식 API/개발자 문서.
2. **2차 자료**: 뉴스 기사, 산업 리포트, 인터뷰, 컨퍼런스 발표.
3. **User feedback**: 앱스토어 리뷰, Reddit/커뮤니티, 트위터/X, G2/Capterra, 고객센터 FAQ, GitHub issues(개발자 제품일 때).
4. **경쟁사/대체재**: 같은 문제를 푸는 다른 회사가 무엇을 하는지.

### 4.3 산출물
- `docs/research/<company>.md` — 회사별: History / Business model / Current strategy / Known pain points / User complaints / Recent moves(최근 6개월) / **출처 링크 필수**.
- 원본 메모의 "공개 데이터가 핵심"이 맞습니다. 추가로: **출처 등급(evidence tier)**을 매기세요 — T1 공식 발표, T2 언론, T3 커뮤니티 추정. 이후 단계에서 근거 강도를 판단하는 기준이 됩니다.

## 5. Problem Statement

- 회사별로 핵심 문제 3~5개 도출. 각 문제는 다음 형식으로:
  > **[Who]**가 **[Situation]**에서 **[Job/Goal]**을 하려 할 때 **[Obstacle]** 때문에 **[Impact]**가 발생한다. (근거: T1/T2/T3)
- 프레임워크: JTBD(Jobs-to-be-Done), 5 Whys(증상이 아닌 구조적 원인까지), Problem Definition Canvas. [7]
- "받은 문제"와 "실제로 풀 가치가 있는 문제"를 분리해서 적을 것.
- 산출물: `docs/problems.md`

## 6. Opportunity Sizing

- 각 문제에 대해 정량화: **영향 받는 사용자 수 × 빈도 × 1회당 비용(시간/돈)**. 매출 관점이면 TAM/SAM/SOM.
- 해커톤에서는 정밀도보다 **자릿수(order of magnitude)와 confidence level**이 중요. "약 10만 명 × 주 2회 × 15분 낭비 (confidence: medium, T2 근거)" 수준이면 충분.
- 산출물: `docs/opportunity_sizing.md` (표 형태)

## 7. Problem Solutioning

- 문제별 솔루션 후보 2~3개씩. 각 후보에:
  - 접근 방식 한 줄
  - **Build cost**: 해커톤 시간 내 구현 난이도(S/M/L), 필요한 API/데이터 확보 가능 여부
  - **Risk**: 기술 리스크, 데이터 접근 리스크, 데모 실패 리스크
  - 차별점(왜 기존 솔루션이 못 풀었는가)
- 산출물: `docs/solutions.md`

## 8. Solution Prioritization

- 점수화 프레임워크: **ICE**(Impact × Confidence × Ease) 또는 **RICE**(Reach, Impact, Confidence, Effort). 해커톤은 Ease/Effort 가중치를 높이는 것이 현실적. [7]
- 추가 축: **평가 기준 적합도(judging fit)** — 1단계 배점표와 매핑.
- 결론 형식: "우리는 [회사 X]의 [문제 Y]를 [솔루션 Z]로 푼다. 데모 scope는 [핵심 플로우 1개]."
- 산출물: `docs/decision.md` + 스코어 표

## 9. Solution Evaluation / Measurement Plan

- **Success metric** 1개(North Star) + 보조 지표 2~3개. 예: 작업 완료 시간 -50%, 정확도 ≥ 90%, 사용자 만족 점수.
- **Baseline**을 먼저 측정(현재 방식으로 했을 때의 수치)하고 데모에서 before/after로 보여줄 것.
- 검증 방법: 골든 데이터셋 평가, 소규모 사용자 테스트, 또는 A/B.
- 심사용으로는 "왜 이 지표가 문제의 해결을 증명하는가" 한 문단 필수.
- 산출물: `docs/measurement.md`

## 10. Loop Engineering

- 정의: 사람이 매번 프롬프트하는 대신, **에이전트를 대신 프롬프트하는 시스템**을 설계하는 것. Addy Osmani(2026.06)가 정리, Karpathy의 "loopy era" 개념에 기반. [8][9]
- **5 primitives + State**: [8][10]
  | Primitive | 역할 | Codex에서 |
  |---|---|---|
  | Automations | 스케줄로 discovery/triage | Automations 탭, `/goal`(run-until-done) |
  | Worktrees | 병렬 에이전트 격리 | 스레드별 내장 worktree |
  | Skills | 프로젝트 지식 문서화 | `SKILL.md`, `$name`으로 호출 |
  | Plugins/Connectors | 외부 도구 연결 | MCP + plugins |
  | Sub-agents | Maker/Checker 분리 | `.codex/agents/*.toml` |
  | State | 실행 간 기억 | `NEXT.md`, `DECISIONS.md`, run ledger |
- 기본 루프 형태: `Discover → Triage → Act → Verify → Report → Remember` [10]
- 해커톤 적용: 해커톤 중에는 **build 루프**(구현 → 테스트 → 검증 에이전트 확인 → 다음 태스크)를, 제출 후에는 **product 루프**(사용자 피드백 수집 → 우선순위 → 개선)로 확장. LazyCodex `$ulw-loop`나 `loop-codex-plugin`(`$loop-init`, `$loop-goal`, `$loop-agents`)이 이 패턴을 그대로 제공. [4][10]
- 주의: 토큰 비용이 크게 튈 수 있으므로 stop condition과 iteration cap 필수. [8]

---

## 원본 메모 대비 보완 포인트 요약

| 원본 | 보완 |
|---|---|
| 유튜브 링크를 던진다 | transcript 추출 후 파일로 주입 (링크만으로는 Codex가 못 읽음) |
| lazyCodex 사용 이유 미기재 | 병렬 리서치 스웜 + 인용 합성 + 검증 루프 |
| insane_search | 차단된 웹/커뮤니티 접근용 플러그인 |
| 출처 기준 없음 | evidence tier(T1/T2/T3) 도입 |
| Sizing 방법 없음 | 사용자 수 × 빈도 × 비용, confidence 명시 |
| Prioritization 기준 없음 | ICE/RICE + judging fit |
| Measurement 구체화 없음 | North Star + baseline + before/after |
| Loop engineering 정의 없음 | 5 primitives + state, Discover→Remember 루프 |

## 출처
1. Codex AGENTS.md 가이드 — https://developers.openai.com/codex/guides/agents-md
2. Codex plugin packaging / `@plugin-creator` — https://developers.openai.com/plugins/build/plugins
3. OpenAI Multi-Agent Workflows 해커톤 후기(Codex 플래그, 멀티에이전트 패턴) — https://www.stdy.blog/openai-multi-agent-workflows-hackathon-retrospective/
4. LazyCodex GitHub — https://github.com/code-yeongyu/lazycodex
5. LazyCodex 사이트(ulw-research, ulw-plan, ulw-loop) — https://lazycodex.ai/
6. codex-insane-search — https://github.com/sinmb79/codex-insane-search
7. pm-skills-arsenal problem-framing skill(Problem Definition Canvas, 5 Whys, JTBD, Opportunity Sizing, ICE/RICE) — https://github.com/Avyayalaya/pm-skills-arsenal
8. Addy Osmani, "Loop Engineering" — https://addyosmani.com/blog/loop-engineering/
9. Loop Engineering with Codex CLI — https://codex.danielvaughan.com/2026/06/11/loop-engineering-codex-cli-autonomous-agent-loops-automations-subagents-goal-mode/
10. loop-codex-plugin — https://github.com/sanky369/loop-codex-plugin
