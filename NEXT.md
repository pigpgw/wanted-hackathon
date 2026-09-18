# NEXT.md

## 현재 상태 (2026-09-19)

- 서비스 구현 완료: 3단계 UI + `/api/decompose`·`/api/execute`·`/api/presets`, 프리셋 캐시·429 적응 재시도. `npm run build` 통과.
- 평가셋 13케이스, 빌드 루프 4회 후 **동결**: exec 100% · P0 0 · 분류일치 10/13 (잔여 3건은 metric 한계·논쟁 케이스, `DECISIONS.md` iter3→4).
- 디자인·데모 마찰 패스 완료: Pretendard·인디고 톤·히어로 "조언이 아니라, 실행." · 프리셋 1클릭 · 샘플 붙여넣기 · 결과 복사/다운로드 · OG 메타.
- **배포 완료**: https://wanted-hackathon.vercel.app (Vercel, CLI 배포 — git push 자동배포 아님, 재배포는 `vercel deploy --prod`). 프로덕션 모델 `gpt-4o-mini` (OpenAI, 유료 크레딧) — 평가셋 재측정 결과 동결 수치와 동일.

## 남은 것 (WP3 — 제출, 마감은 공식 포털에서 재확인)

1. 배포 환경 수동 확인 — 프리셋 3개 + 직접 입력 1개(파일 업로드·붙여넣기). 결과를 `docs/process_log.md` DEPLOY 행에 기록.
2. 16:9 스크린샷 1~5장 (히어로 / 분해 맵 / 실행 결과 before-after / 프롬프트팩) → `docs/submission/submission_draft.md` 스크린샷 채우고 제출.
3. 제출 후: 심사 기간 매일 `./scripts/ops_check.sh https://wanted-hackathon.vercel.app`, OpenAI 크레딧 잔액 확인.

## 메모

- 로컬 `:3000`이 점유된 머신에서는 `PORT=3001 npm run dev`.
