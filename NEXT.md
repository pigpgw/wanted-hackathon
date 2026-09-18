# NEXT.md

## 지금 진행 중

- **Phase B — 빌드 단계.** 솔루션: A "업무→실행 자동화기" (`docs/service_design.md`).
- 리포 검수·정리 완료 (2026-09-18): API 계약 통일(`lib/types.ts`+§4+`eval_run.py`), 프리셋 데모 산수 오류 수정, stale S2a 제거, 문서 기준·소유권 규칙 정리 (`AGENTS.md`).
- 스캐폴드 부분 완료: `package.json`·configs·`lib/types.ts`·`lib/presets.ts`·`lib/engine.ts`(LLM 호출+mock 폴백) 존재. `app/`·`node_modules` 없음.
- iter 카운터: 0/10.

## 작업 패키지 (병렬 세션 배정용)

| WP | 범위 | 소유 파일 | 완료 조건 |
|---|---|---|---|
| WP1 eval_set | 케이스 1→13개 (정리·보고·변환 8 + 경계 5) | `eval_set/**` 만 | `eval_set/README.md` 규격 충족 · `lib/presets.ts` 서술과 불중복 · 가짜 데이터만 |
| WP2 service | Next.js 앱 + API 라우트 2개 (engine.ts는 구현됨 — 라우트에서 프리셋 조회+재시도·폴백 연결 필요) | `app/**`, `lib/engine.ts`, `.env*`, `package.json`, `package-lock.json` | `npm run build` 통과 + 프리셋 3개로 전체 플로우 로컬 동작 |
| WP3 배포·제출 | Vercel 배포 + 검증 + 스크린샷 + 제출 폼 | 오케스트레이터 담당 | `ops_check.sh` 통과 + 제출 완료 |

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
| WP1 eval_set | (미배정) | | | |
| WP2 service | (미배정) | | | |

## 다음 행동

1. **사용자**: LLM API 키 발급 (Upstage Solar 우선 — api.upstage.ai, 없으면 OpenAI/Claude 키) → `.env` 설정. 키 없어도 프리셋 폴백으로 개발·데모 가능.
2. WP1 워커 기동 → 새 탭 `devin` 대화형 + 시작 지시 (위 프로토콜). session id는 오케스트레이터가 레지스트리에 기록
3. WP2 → 이 세션에서 subagent로 처리 권장 (lock·권한 문제 없음). 별도 탭으로 둘 경우 동일 절차
4. WP2 완료 후: `npm install` → dev 서버 → `/loop-iterate` 빌드 루프 (stop: P0=0·실행 성공률≥90%·분해 적절성≥80%, cap 10회)
5. 과제 제출(9/21 00:00 마감) 전: WP3 — 배포 + 검증 + 제출 문서 + 스크린샷 (`docs/submission/submission_checklist.md`)
