# NEXT.md

## 현재 상태 (2026-09-19)

- 서비스 구현: 3단계 UI + `/api/decompose`·`/api/execute`·`/api/presets`·`/api/revise`(v2), 프리셋 캐시·429 적응 재시도. `npm run build` 통과.
- **v2 "재작업 제거" 구현 완료**: ①`output_format` 사용자 양식 채움(캐시 우회) ②코드 재계산 검증 카드(`lib/verify.ts` — 표 데이터(CSV/TSV/세미콜론) 그룹 집계 대조, 불일치 시 재계산값 제시. LLM 자기 검증은 순환 논리라 폐기, `source: code|llm`으로 출처 배지 구분) ③`/api/revise` 자연어 수정+재검증 루프 ④레시피 링크(URL `#r=` fragment 인코딩 — stateless 유지). 프리셋 3종 검증 카드 포함.
- 디자인: 토스 디자인 시스템 전면 적용 — 공식 TDS 팔레트 전수 통일(blue50~700·grey·green·orange·red 토큰), 플랫 카드 24px·그레이 채움 입력·모바일 반응형.
- **비개발자 UX 패스**: ①입력 — 엑셀 복사·붙여넣기(TSV)·.tsv 파일 업로드 지원 ②출력 — 복사/.md/엑셀용 CSV(BOM)/PDF(인쇄) 4종, 결과물 렌더링=미리보기. 네이티브 .xlsx/.pptx는 non-goal(§9) ③첫 방문 **react-joyride 인터랙티브 투어(8스텝)** — `before` 훅이 예시 채우기→분해→선택→실행을 실제 구동 +「사용법」버튼 ④실행 중 단계 안내 문구 순환 ⑤분해 실패 시 "예시로 체험" 탈출 버튼.
- 평가셋 13케이스, 빌드 루프 4회 후 **동결**: exec 100% · P0 0 · 분류일치 10/13.
- **배포**: https://wanted-hackathon.vercel.app — 최신 코드 전부 배포 완료. 프로덕션 모델 `gpt-4o-mini` (`LLM_*` env — `engine.ts` 기본값도 동일 정합). 프로덕션에서 TSV 입력→코드 검증→오계산 적발·투어 실구동까지 전 경로 실측.
- **제출 자산 완성**: 스크린샷 6장(`~/Desktop/wanted-screenshots/` — 대표이미지+5, 16:9·2560×1440) + 필드별 확정 텍스트(`~/Desktop/wanted-submission.md` = `docs/submission/submission_draft.md` 동일본 — 문제 한 문장·AI활용 425자·칩 4개).

## 남은 것 (제출 마감 2026-09-20 종일 = 9/21 00:00 KST)

1. **제출 폼 입력·제출 — 사용자가 직접 진행 중**: 필드별 텍스트 붙여넣기 → 칩 4개(ChatGPT·Next.js·React·Vercel) → 링크 → 대표이미지+스크린샷 5장 → 「과제 제출하기」(임시저장≠제출, 팀장 계정).
2. 제출 후: 심사 기간(9/21~10/5) 매일 `./scripts/ops_check.sh https://wanted-hackathon.vercel.app`, OpenAI 크레딧 잔액 확인 — 투어가 방문자당 decompose 1회 호출함.

## 메모

- 로컬 `:3000`이 점유된 머신에서는 `PORT=3001 npm run dev`.
- 레시피 링크는 `#r=` fragment에 워크플로 인코딩 — 서버 저장 없음. 링크 받은 사람은 서술 내용을 볼 수 있음(기밀 서술 주의).
