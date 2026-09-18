# NEXT.md

## 현재 상태 (2026-09-19)

- 서비스 구현 완료: 3단계 UI + `/api/decompose`·`/api/execute`·`/api/presets`, 프리셋 캐시·429 적응 재시도. `npm run build` 통과.
- 평가셋 13케이스, 빌드 루프 4회 후 **동결**: exec 100% · P0 0 · 분류일치 10/13 (잔여 3건은 metric 한계·논쟁 케이스, `DECISIONS.md` iter3→4).
- 디자인·데모 마찰 패스 완료: Pretendard·인디고 톤·히어로 "조언이 아니라, 실행." · 프리셋 1클릭 · 샘플 붙여넣기 · 결과 복사/다운로드 · OG 메타.
- 실측 모델: `gemini-3.1-flash-lite` (Gemini 무료 티어, 20 RPM). `.env.example` 기본값은 Upstage `solar-pro3` — 배포 시 하나로 확정.

## 남은 것 (WP3 — 배포·제출, 마감 9/21 00:00)

1. **프로덕션 LLM 키·모델 확정** — 무료 티어 RPM으로는 투표 기간 트래픽 위험. `.env.example`·`submission_draft.md` 스택 표기를 확정 모델과 일치시킬 것.
2. Vercel 배포 — env: `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`.
3. 배포 검증 — `./scripts/ops_check.sh <url>` + 프리셋 3개 + 직접 입력 1개(파일 업로드·붙여넣기) 수동 확인. 결과를 `docs/process_log.md` DEPLOY 행에 기록.
4. 16:9 스크린샷 1~5장 (히어로 / 분해 맵 / 실행 결과 before-after / 프롬프트팩) → `docs/submission/submission_draft.md` URL·스크린샷 채우고 제출.

## 메모

- 로컬 `:3000`이 점유된 머신에서는 `PORT=3001 npm run dev`.
