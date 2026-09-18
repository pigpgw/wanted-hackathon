# NEXT.md

## 지금 진행 중

- **Phase B — 빌드 단계.** 솔루션: A "업무→실행 자동화기" (`docs/service_design.md`).
- **WP1·WP2 완료** (2026-09-18): eval_set 13케이스 확충 + Next.js 서비스 구현(3단계 UI·API 3개·Tailwind+shadcn·프리셋 캐시/재시도/폴백). `npm run build` 통과, 로컬 계약 curl 검증 완료.
- 오케스트레이터 검수 수정: `/api/execute` 프리셋 캐시에 `sample_data` 일치 조건 추가 (다른 데이터에 통조림 결과 반환 방지).
- iter 카운터: **0/10** — iter0 스모크는 mock 모드 파이프라인 검증일 뿐 (eval_run.py 실행·산출 정상 확인). 품질 수치는 `LLM_API_KEY` 설정 후 iter1부터.

## 작업 패키지 (병렬 세션 배정용)

| WP | 범위 | 소유 파일 | 완료 조건 | 상태 |
|---|---|---|---|---|
| WP1 eval_set | 케이스 1→13개 (정리·보고·변환 8 + 경계 5) | `eval_set/**` 만 | `eval_set/README.md` 규격 충족 · `lib/presets.ts` 서술과 불중복 · 가짜 데이터만 | ✅ 완료 |
| WP2 service | Next.js 앱 + API 라우트 (engine.ts는 구현됨 — 라우트에서 프리셋 조회+재시도·폴백 연결) | `app/**`, `components/**`, `lib/engine.ts`, `lib/utils.ts`, `.env*`, `package.json`, `package-lock.json` | `npm run build` 통과 + 프리셋 3개로 전체 플로우 로컬 동작 | ✅ 완료 |
| WP3 배포·제출 | Vercel 배포 + 검증 + 스크린샷 + 제출 폼 | 오케스트레이터 담당 | `ops_check.sh` 통과 + 제출 완료 | 대기 |

### 공통 규칙

- API 계약 = `lib/types.ts` + `docs/service_design.md` §4 (**frozen**). 변경 필요 시 같은 커밋에 `scripts/eval_run.py`·`scripts/ops_check.sh` 동기화.
- WP2에서 `lib/types.ts`·`lib/presets.ts`·`eval_set/**`는 **읽기 전용**.
- 실패 모드·non-goals는 `service_design.md` §9·§10 준수 — 프리셋 캐시 폴백(`lib/presets.ts`)은 API 실패 시 폴백으로 사용.
- 환경변수: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (`.env.example`). OpenAI 호환 클라이언트로 작성해 모델 교체 가능하게.

## 오케스트레이션 (메인 세션 → 워커 세션)

> 실측 검증된 경로만 사용. tmux·자율 `-p` 원샷 미도입 (결정 근거: DECISIONS.md).

- **워커 기동 (기본)**: 사용자가 새 터미널 탭에서 `devin` 대화형으로 띄우고 시작 지시 직접 입력 — 권한 승인(npm install 등)도 그 자리에서 사용자가 처리.
- **WP2는 메인 세션 subagent 권장**: lock·권한 모드 문제 없이 spawn·read·resume 가능.
- **검수(읽기)**: `devin list --format json`으로 세션 확인 → `~/.local/share/devin/cli/transcripts/<session-id>.json` 읽기 — 전체 대화·툴 호출·응답 포함.
- **후속 지시(쓰기)**:
  - 탭 열려있음 → 오케스트레이터가 지시 패키지 작성 → 사용자가 탭에 붙여넣기.
  - 세션 닫혀있음 → `devin -r <session-id> -p "지시"` 직접 주입 (실측됨). 열려있으면 lock으로 실패(`failed to start ACP agent session`).
- **워커는 NEXT.md 읽기 전용** — 레지스트리·상태 기록은 전부 오케스트레이터가 수행 (워커 측 쓰기 충돌·미보고 원천 제거).
- 세션 시작 지시에 반드시 포함: "NEXT.md 읽고 WP<n> 수행 — 소유 파일 외 수정 금지, git 커밋 금지 (오케스트레이터가 통합·커밋). 완료 조건은 WP 표 참조".

### 세션 레지스트리
| WP | session id | 모드 | 상태 | 메모 |
|---|---|---|---|---|
| WP1 eval_set | subagent f4546284 (메인 세션 내) | background subagent | **완료·검수 통과** | 13개 케이스 (normal 8 + boundary 5). 오케스트레이터 독립 검증 통과 — 커밋 대기 |
| WP2 service | subagent 4771d11b | 메인 세션 subagent | ✅ 완료·검수 통과 | build·curl 계약 검증. execute 캐시에 sample_data 일치 조건 추가 (오케스트레이터 수정) |

## 다음 행동

1. **사용자**: LLM API 키 발급 (Upstage Solar 우선 — api.upstage.ai, 없으면 OpenAI/Claude 키) → `.env` 설정. 키 없어도 프리셋 폴백으로 개발·데모 가능.
2. 키 설정 후 `/loop-iterate` — iter1부터 실측 (분해 적절성·실행 성공률·P0, cap 10회). 경계 케이스 09~12의 정직한 분류가 최대 관심 대상.
3. **주의**: 이 머신 `:3000`은 다른 프로젝트의 next-server(v16)가 점유 중 — 로컬 eval은 `PORT=3001` 등으로 띄우고 `--base-url` 지정할 것.
4. WP3: Vercel 배포 → `ops_check.sh` → 스크린샷 → 제출 (`docs/submission/submission_checklist.md`, 마감 9/21 00:00)
