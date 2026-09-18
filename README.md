# 업무→실행 자동화기

원티드 AI Championship 2026 출전작. 반복 업무를 말로 적으면 AI가 단계로 분해하고, 자동화하기 좋은 단계를 골라 **샘플 데이터로 그 자리에서 1회 실행**해 결과물·before/after·재사용 프롬프트팩을 보여준다.

- 제출 마감: 2026-09-21 00:00 · 심사 기간(9/21~10/5) 서비스 접속 유지 필수
- 대회 페이지: https://event.wanted.co.kr/ai-championship/2026

## 실행

```bash
cp .env.example .env      # LLM_API_KEY / LLM_BASE_URL / LLM_MODEL (OpenAI 호환)
npm install
npm run dev               # http://localhost:3000
```

키가 없으면 mock 모드로 플로우만 확인 가능. 프리셋 3개는 캐시된 결과를 반환한다 (`lib/presets.ts`).

## 검증

```bash
npm run build                                   # 타입·빌드
python3 scripts/eval_run.py --base-url <url>    # 평가셋 13케이스 → eval_runs/<ts>/
./scripts/ops_check.sh <url>                    # 배포 생존 확인
```

## 문서

| 문서 | 내용 |
|---|---|
| `NEXT.md` | 현재 상태·다음 행동 — 세션 시작 시 먼저 읽기 |
| `DECISIONS.md` | 결정 로그 (날짜—결정—이유) |
| `docs/service_design.md` | 서비스 기획서 — 입출력 계약(`lib/types.ts`와 동기)·스코어링·non-goals |
| `docs/measurement.md` | North Star 지표 |
| `docs/discovery/problems.md` → `decision.md` | 문제 정의·대체재 분석 → 솔루션 선정 근거 |
| `docs/contest/rules.md` | 대회 룰·심사 기준·일정 |
| `docs/submission/` | 제출 체크리스트·제출 폼 초안 |
| `docs/process_log.md` | 작업 이력 — 제출 문서 수치의 출처 |
| `eval_set/README.md` | 평가셋 규격 |
