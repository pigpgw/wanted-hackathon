# NEXT.md

## 현재 상태 (2026-09-19)

- 서비스 구현: 3단계 UI + `/api/decompose`·`/api/execute`·`/api/presets`·`/api/revise`(v2), 프리셋 캐시·429 적응 재시도. `npm run build` 통과.
- **v2 "재작업 제거" 구현 완료**: ①`output_format` 사용자 양식 채움(캐시 우회) ②코드 재계산 검증 카드(`lib/verify.ts` — CSV 그룹 집계 대조, 불일치 시 재계산값 제시. LLM 자기 검증은 순환 논리라 폐기) ③`/api/revise` 자연어 수정+재검증 루프 ④레시피 링크(URL `#r=` fragment 인코딩 — stateless 유지). 프리셋 3종 검증 카드 포함. 실측: gpt-4o-mini 오계산(1,686,000/정답 1,886,000)을 코드 검증이 정확히 적발 → 수정 후 "3건 일치".
- 디자인: 토스 디자인 시스템 전면 적용(#3182F6·플랫·그레이 입력) + 모바일 반응형.
- 평가셋 13케이스, 빌드 루프 4회 후 **동결**: exec 100% · P0 0 · 분류일치 10/13.
- **배포**: https://wanted-hackathon.vercel.app (Vercel CLI — git push 자동배포 아님, 재배포는 `vercel deploy --prod`). 프로덕션 모델 `gpt-4o-mini`. ⚠️ v2 코드는 아직 로컬·깃허브만 — **프로덕션 반영은 `vercel deploy --prod` 필요**.

## 남은 것 (제출, 마감 2026-09-21 00:00)

1. v2 재배포: `vercel deploy --prod` 후 프로덕션에서 양식 채움·검증 카드·수정·레시피 링크 수동 확인 → `docs/process_log.md` DEPLOY 행.
2. 16:9 스크린샷 1~5장 (히어로 / 분해 맵 / 실행 결과 / **검증 카드 "확인 필요" 장면** / 레시피 링크) → 제출 폼 작성.
3. 제출 후: 심사 기간 매일 `./scripts/ops_check.sh https://wanted-hackathon.vercel.app`, OpenAI 크레딧 잔액 확인.

## 메모

- 로컬 `:3000`이 점유된 머신에서는 `PORT=3001 npm run dev`.
- 레시피 링크는 `#r=` fragment에 워크플로 인코딩 — 서버 저장 없음. 링크 열 때 브라우저가 복원.
