#!/bin/bash
# SessionStart 훅 — 루프 상태를 additionalContext로 주입.
# stdin의 훅 페이로드는 사용하지 않음. 출력은 stdout의 JSON 1개.

cd "${DEVIN_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

context=""

# 루프 모드 판정: ops_log.md가 있으면 운영 루프, 아니면 빌드 루프
if [ -f ops_log.md ]; then
  mode="OPS (운영 루프 — 기능 변경 동결, P0 핫픽스만 허용)"
else
  mode="BUILD (빌드 루프 — loop-iterate 1변수 반복)"
fi
context+="Loop mode: $mode\n"

# NEXT.md에서 상태 요약
if [ -f NEXT.md ]; then
  next_state=$(sed -n '/## 지금 진행 중/,/## 다음 행동/p' NEXT.md | grep -v '^##' | head -5)
  context+="NEXT.md: $next_state\n"
fi

# 최근 eval run 점수 요약
latest_run=$(ls -dt eval_runs/*/ 2>/dev/null | head -1)
if [ -n "$latest_run" ] && [ -f "${latest_run}scores.md" ]; then
  scores=$(tail -8 "${latest_run}scores.md" | tr '\n' ' ')
  context+="Latest eval ($(basename "$latest_run")): $scores\n"
fi

# JSON 이스케이프: 백슬래시·따옴표
context_escaped=$(printf '%s' "$context" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')

printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' "$context_escaped"
exit 0
