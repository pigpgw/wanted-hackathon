# AGENTS.md — 업무→실행 자동화기 (원티드 AI Championship 2026)

## 대회 요약

- 오픈 토픽 AI 해커톤. 제출물 = **배포된 작동 서비스 링크** + 문제 정의/AI 활용 방식/기술 스택/스크린샷(16:9).
- 제출 마감 **2026-09-21 00:00**. 심사 기간(9/21~10/5) 내내 서비스 작동 필수.
- 예선: 내부 심사 80% + 투표 20% (기획력·실현가능성·확장성·AI 활용 적절성). 상세: `docs/contest/rules.md`.

## 구조

```
app/            Next.js App Router — page.tsx + /api/decompose · /api/execute · /api/presets · /api/revise
components/     automation-app.tsx (3단계 UI) · ui/ (shadcn 프리미티브)
lib/            types.ts (API 계약 SoT) · engine.ts (LLM 호출 + mock) · verify.ts (코드 재계산 검증) · presets.ts (데모 프리셋 캐시)
eval_set/       cases/<id>/ — description.txt + sample.* + expected.json (규격: eval_set/README.md)
scripts/        eval_run.py (평가셋 실행·채점) · ops_check.sh (배포 생존 확인)
docs/           service_design.md · measurement.md · process_log.md · contest/ · discovery/ · submission/ · screenshots/ (README 임베드용)
NEXT.md         현재 상태·다음 행동 — 세션 시작 시 먼저 읽기
DECISIONS.md    결정 로그 (날짜—결정—이유)
```

## Single source of truth

| 정보 | SoT | 규칙 |
|---|---|---|
| API 계약 | `lib/types.ts` (+ `docs/service_design.md` §4) | 바꾸면 `scripts/eval_run.py`·`scripts/ops_check.sh`를 같은 커밋에서 동기화 |
| 서비스 스펙 | `docs/service_design.md` | 변경 시 `DECISIONS.md`에 이유 기록 |
| 진행 상태 | `NEXT.md` | 작업 끝낼 때마다 갱신 |
| 실측 수치 | `docs/process_log.md` | 제출 문서·발표 수치의 출처. 추정과 실측을 구분 표기 |

문서 간 같은 내용 복제 금지 — 참조는 경로 링크로.

## 작업 컨벤션

- **스코프 최우선**: 남은 시간 내 1인이 완성 가능한 것만. 새 기능·문서·스크립트는 "핵심 플로우 1개 완성 또는 제출에 기여하는가"를 먼저 묻고, 아니면 안 한다.
- **정직성**: 수치·모델명은 실측 기준으로 쓰고, 프리셋 캐시 결과와 실시간 LLM 결과는 문서에서 구분한다.
- 프롬프트·모델·실행 로직 변경은 한 번에 하나만 — `DECISIONS.md`에 이유 기록.
- 커밋: conventional commits (`feat:`/`fix:`/`docs:`).
- 비밀값(`.env*`)은 커밋 금지 — `.env.example`에 키 이름만.

## 검증

- 코드: `npm run build` 통과 + (dev 서버 기동 후) `python3 scripts/eval_run.py`.
- 배포 후: `./scripts/ops_check.sh <url>` + 프리셋 3개·직접 입력 1개 수동 플로우 확인.
