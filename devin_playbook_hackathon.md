Playbook: Hackathon Builder Workflow (Research → Problem → Solution → Loop)

## Overview
해커톤 참가 시 룰 파악부터 리서치, problem statement, opportunity sizing, solution prioritization, measurement plan, loop engineering 셋업까지를 하나의 레포 안에 문서 산출물로 만들어내는 워크플로우다. 코딩보다 context building과 의사결정을 먼저 끝내고, 그 결과를 AGENTS.md / skills / automation으로 고정하는 것이 목적이다.

## What's Needed From User
- 해커톤 공식 페이지 URL (룰, 평가 기준, 마감, 제출 형식)
- 출제 문제(challenge statement) 원문 또는 링크
- 출제자/스폰서 기업·기관 목록
- 출제자 제공 컨텍스트: YouTube 영상 링크, 데이터셋, API 문서 등
- 작업할 레포 (없으면 새 레포 이름)
- 선택: 팀 컨벤션(브랜치 네이밍, 커밋 스타일), 선호 기술 스택

## Procedure
1. 해커톤 페이지를 읽고 `docs/rules.md`를 작성한다 — 평가 기준과 배점 비율 표, 제출물 형식, 마감, 허용 도구, 스폰서 트랙, 심사위원 프로필, "what wins" 가설 1~2줄.
2. challenge statement 원문을 `docs/challenge.md`에 저장하고, 출제 의도 해석과 제공 리소스(영상/데이터/API) 인벤토리를 덧붙인다.
3. YouTube 영상은 `yt-dlp --write-auto-sub --skip-download`로 transcript를 추출해 `docs/context/videos/<slug>.md`로 저장하고 핵심 주장 5줄 요약을 붙인다. 링크만 저장하지 않는다.
4. 레포 루트에 `AGENTS.md` 초안을 만든다 — 해커톤 룰 요약, challenge 한 문단, 산출물 파일 구조, 팀 컨벤션, 검증 명령. `README.md`에 프로젝트 목적과 문서 지도를 적는다.
5. 기업·기관별 리서치를 수행해 `docs/research/<company>.md`를 작성한다. 기업이 3개 이상이면 기업당 child session으로 병렬 처리한다. 각 파일 섹션: History / Business model / Current strategy / Known pain points / User complaints / Recent moves(최근 6개월) / Sources. 모든 주장에 출처 URL과 evidence tier(T1 공식 발표, T2 언론·리포트, T3 커뮤니티·추정)를 붙인다.
6. 리서치를 바탕으로 `docs/problems.md`를 작성한다 — 기업별 핵심 문제 3~5개, 형식: "[Who]가 [Situation]에서 [Job]을 하려 할 때 [Obstacle] 때문에 [Impact]가 발생한다 (근거 tier)". 5 Whys로 증상이 아닌 구조적 원인까지 내려가고, "받은 문제"와 "실제 풀 가치가 있는 문제"를 구분한다.
7. `docs/opportunity_sizing.md`에 문제별 기회 크기를 표로 정리한다 — 영향 사용자 수 × 빈도 × 1회 비용(시간/돈), 자릿수(order of magnitude)와 confidence(high/medium/low), 근거 tier.
8. `docs/solutions.md`에 문제별 솔루션 후보 2~3개를 적는다 — 접근 방식 한 줄, build cost(S/M/L, 해커톤 시간 기준), 필요한 API·데이터 확보 가능 여부, 리스크(기술/데이터/데모 실패), 기존 솔루션 대비 차별점.
9. `docs/decision.md`에 ICE(Impact × Confidence × Ease) 점수표에 judging fit(1단계 배점표와의 매핑) 열을 추가해 우선순위를 매기고, 결론을 한 문장으로 적는다: "우리는 [기업 X]의 [문제 Y]를 [솔루션 Z]로 푼다. 데모 scope는 [핵심 플로우 1개]."
10. `docs/measurement.md`에 North Star metric 1개와 보조 지표 2~3개, baseline 측정 방법, 데모에서 before/after를 보여줄 방식, "왜 이 지표가 문제 해결을 증명하는가" 한 문단을 적는다.
11. Loop engineering 셋업: 결정된 솔루션의 반복 작업(테스트·검증·피드백 수집)을 `.agents/skills/<name>/SKILL.md`로 만들고, `docs/loop.md`에 Discover → Triage → Act → Verify → Report → Remember 루프 정의, stop condition, iteration cap, 상태 파일(`NEXT.md`, `DECISIONS.md`)을 정의한다. 스케줄 실행이 필요하면 Devin Automation 제안 내용을 함께 적는다.
12. 모든 문서의 출처 링크가 실제로 열리는지 확인하고, `docs/` 전체를 브랜치에 커밋해 PR을 생성한다. PR 본문에 decision 한 문장과 문서 지도를 넣는다.

## Specifications
- 산출물: `docs/rules.md`, `docs/challenge.md`, `docs/context/videos/*.md`, `AGENTS.md`, `README.md`, `docs/research/<company>.md`(기업당 1개), `docs/problems.md`, `docs/opportunity_sizing.md`, `docs/solutions.md`, `docs/decision.md`, `docs/measurement.md`, `docs/loop.md`, `.agents/skills/*/SKILL.md`
- 리서치 문서의 모든 사실 주장에 출처 URL과 evidence tier가 있어야 한다.
- problems.md의 각 문제는 Who/Situation/Job/Obstacle/Impact 형식을 지킨다.
- decision.md에는 점수표와 한 문장 결론이 모두 있어야 한다.
- Validation: 12단계에서 출처 링크를 전수 확인하고, 사용자에게 decision 한 문장과 top-3 후보 점수를 메시지로 보고한다.

## Advice and Pointers
- 시간 배분: 1~7단계(context)가 전체의 40~50%를 차지해도 정상이다. 코딩을 서두르지 않는다.
- 채용 공고와 최근 6개월 보도자료는 기업이 지금 투자하는 문제 영역을 가장 잘 드러낸다.
- User feedback 소스: 앱스토어 리뷰, Reddit, X, G2/Capterra, 고객센터 FAQ, GitHub issues(개발자 제품).
- 정밀한 시장 규모보다 자릿수와 confidence를 정확히 적는 것이 심사에서 더 설득력 있다.
- 해커톤은 Ease 가중치를 높이는 것이 현실적이다. 데모 scope는 항상 핵심 플로우 1개로 제한한다.

## Forbidden Actions
- 출처 없는 수치나 주장을 문서에 쓰지 않는다.
- 리서치가 끝나기 전에 솔루션 구현 코드를 작성하지 않는다.
- YouTube 링크를 transcript 없이 컨텍스트로 취급하지 않는다.
- 3번 이상 같은 기업에 대해 같은 검색을 반복하지 않는다 — 찾지 못하면 "정보 없음(T3)"으로 기록하고 넘어간다.
