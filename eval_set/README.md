# eval_set — 업무→실행 자동화기 평가셋

케이스 구성 계획은 `docs/service_design.md` §12. 실행·채점은 `scripts/eval_run.py`.

## 케이스 디렉터리 규격

```
cases/<case-id>/
  description.txt   # 업무 자유 서술 (실제 입력 그대로)
  sample.csv|txt|md # 실행 단계용 샘플 데이터 (≤500KB, PII 금지)
  expected.json     # 수작업 기대 태그
```

`expected.json` 필드:

| 필드 | 의미 |
|---|---|
| `type` | `report` / `transform` / `draft` / `boundary` |
| `expected_steps` | 기대하는 업무 단계 이름 목록 (분해 적절성 인간 채점 기준) |
| `expected_automatable.executable_at_least_one` | executable 단계가 1개 이상 나와야 하는지 |
| `expected_automatable.recommended_step_should_be` | 추천 단계의 기대 분류 |
| `sample_file` | 샘플 파일명 |
| `notes` | 케이스 의도 |

## 규칙

- 케이스 12~15개: 정리·보고·변환 유형 8개 + 경계 케이스(실행 불가·모호·비정형 서술) 4~7개.
- **데모 프리셋 입력과 겹치지 않게** — 평가셋은 unseen 유지, 프리셋은 별도 최적화.
- 샘플 데이터는 가짜 데이터만 사용 (실제 회사·고객 데이터 금지).
- 실행: `python3 scripts/eval_run.py` → 결과는 `eval_runs/<timestamp>/`.
