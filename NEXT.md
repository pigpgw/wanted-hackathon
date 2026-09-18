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
| WP2 service | Next.js 앱 + API 라우트 2개 (engine.ts는 구현됨 — 라우트에서 프리셋 조회+재시도·폴백 연결 필요) | `app/**`, `lib/engine.ts`, `.env*`, `package.json` | `npm run build` 통과 + 프리셋 3개로 전체 플로우 로컬 동작 |
| WP3 배포·제출 | Vercel 배포 + 검증 + 스크린샷 + 제출 폼 | 오케스트레이터 담당 | `ops_check.sh` 통과 + 제출 완료 |

### 공통 규칙

- API 계약 = `lib/types.ts` + `docs/service_design.md` §4 (**frozen**). 변경 필요 시 같은 커밋에 `scripts/eval_run.py`·`scripts/ops_check.sh` 동기화.
- WP2에서 `lib/types.ts`·`lib/presets.ts`·`eval_set/**`는 **읽기 전용**.
- 실패 모드·non-goals는 `service_design.md` §9·§10 준수 — 프리셋 캐시 폴백(`lib/presets.ts`)은 API 실패 시 폴백으로 사용.
- 환경변수: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (`.env.example`). OpenAI 호환 클라이언트로 작성해 모델 교체 가능하게.

## 다음 행동

1. **사용자**: LLM API 키 발급 (Upstage Solar 우선 — api.upstage.ai, 없으면 OpenAI/Claude 키) → `.env` 설정. 키 없어도 프리셋 폴백으로 개발·데모 가능.
2. 세션 A → WP1 (eval_set 확충)
3. 세션 B → WP2 (서비스 구현)
4. WP2 완료 후: `npm install` → dev 서버 → `/loop-iterate` 빌드 루프 (stop: P0=0·실행 성공률≥90%·분해 적절성≥80%, cap 10회)
5. 과제 제출(9/21 00:00 마감) 전: WP3 — 배포 + 검증 + 제출 문서 + 스크린샷 (`docs/submission_checklist.md`)
