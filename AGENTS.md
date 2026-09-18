# AGENTS.md — 원티드 AI Championship 2026

## 대회 요약

- 원티드랩 주최 AI 해커톤. 오픈 토픽 — AI로 실제 문제 해결 or 새 가치 창출.
- 제출 마감: **2026-09-20(일)**. 제출물: **배포된 작동 서비스 링크** + 문제 정의/AI 활용 방식/기술 스택.
- 예선: 내부 심사 80% + 투표 20% (기획력·실현가능성·확장성·AI 활용 적절성) → TOP20 → 10/17 데모데이.
- 심사 기간(9/21~10/5) 내내 서비스 링크 작동 필수.
- 상세: `docs/rules.md`, `docs/challenge.md`

## 산출물 구조

```
docs/
  rules.md              # 룰·배점·일정·심사위원·what wins
  challenge.md          # 오픈 토픽 해석·리소스 인벤토리
  research/<company>.md # 심사위원·파트너사 리서치
  problems.md           # 문제 정의 (Who/Situation/Job/Obstacle/Impact)
  opportunity_sizing.md # 기회 크기
  solutions.md          # 솔루션 후보
  decision.md           # ICE + judging fit 점수표·한 문장 결론
  measurement.md        # North Star metric
  loop.md               # loop engineering 정의
  context/videos/*.md   # 영상 transcript (있을 경우)
.agents/skills/*/SKILL.md
NEXT.md, DECISIONS.md   # 루프 상태 파일
```

## 작업 컨벤션

- 모든 사실 주장에 출처 URL + evidence tier (T1 공식, T2 언론·리포트, T3 커뮤니티·추정) 표기.
- 리서치 완료 전 구현 코드 작성 금지.
- 커밋: conventional commits, docs 변경은 `docs:` prefix.
- 서비스는 2주 무료 티어 생존 가능 스택 (정적 호스팅 + 서버리스 + 관리형 LLM API) 우선.

## 검증 명령

- 문서 작업: `docs/` 내 모든 링크가 열리는지 확인 (curl 또는 webfetch).
- 서비스 작업(추후): 배포 후 `curl -I <url>` 200 확인, 핵심 플로우 수동 검증.
