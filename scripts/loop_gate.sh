#!/bin/bash
# Stop 훅 — 서비스 코드가 마지막 eval 이후 변경됐는데 eval_runs가 없으면 stop 차단.
# 비활성 조건: 평가셋 없음 / 서비스 코드 없음 / .loop_gate_off 존재.
# 점수 미달은 block하지 않음 — "변경 후 eval 미실행" 1개 조건만 검사 (무한 루프 방지).

cd "${DEVIN_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0

# 우회 스위치
[ -f .loop_gate_off ] && exit 0

# 평가셋이 없으면(스캐폴드 단계) 게이트 비활성
[ -d eval_set/cases ] || exit 0
ls eval_set/cases/*/expected.json >/dev/null 2>&1 || exit 0

# eval_runs가 1회도 없으면 비활성 — 게이트는 "eval 이후 변경 회귀"만 감시.
# (첫 빌드 중엔 eval 파이프라인 자체가 안 돌아 block만 반복됨)
ls -d eval_runs/*/ >/dev/null 2>&1 || exit 0

# 감시 대상: 서비스 코드·프롬프트 파일 (존재하는 것만)
watch_dirs=""
for d in app pages src lib prompts; do
  [ -d "$d" ] && watch_dirs="$watch_dirs $d"
done
[ -z "$watch_dirs" ] && exit 0

# 서비스 코드 중 가장 최근 변경 시각
latest_code_change=$(find $watch_dirs -type f -exec stat -f '%m %N' {} + 2>/dev/null | sort -rn | head -1 | cut -d' ' -f1)
[ -z "$latest_code_change" ] && exit 0

# 가장 최근 eval run의 시각 (디렉터리 mtime)
latest_eval=$(stat -f '%m' "$(ls -dt eval_runs/*/ 2>/dev/null | head -1)" 2>/dev/null)
latest_eval=${latest_eval:-0}

# 코드 변경이 eval보다 최근 → block
if [ "$latest_code_change" -gt "$latest_eval" ]; then
  changed_file=$(find $watch_dirs -type f -exec stat -f '%m %N' {} + 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
  printf '{"decision": "block", "reason": "코드 변경(%s) 후 eval 미실행. /work-hack-eval 로 평가셋을 돌리거나, 의도적 스킵이면 touch .loop_gate_off 후 DECISIONS.md에 사유 기록."}\n' "$changed_file"
  exit 0
fi

exit 0
