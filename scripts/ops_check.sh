#!/bin/bash
# 운영 루프 (9/21~10/5): 1일 1회 생존 확인 → ops_log.md append.
# 사용: ./scripts/ops_check.sh <서비스 URL>   또는   SERVICE_URL=... ./scripts/ops_check.sh
# cron 예: 0 9 * * * cd /path/to/wanted-hackathon && ./scripts/ops_check.sh https://xxx.vercel.app
# exit 1 = P0 (다운/5xx/canonical 실패) → devin -p 진단 세션 트리거용.

cd "${DEVIN_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 1

URL="${1:-$SERVICE_URL}"
if [ -z "$URL" ]; then
  echo "usage: $0 <서비스 URL>" >&2
  exit 1
fi
URL="${URL%/}"
NOW=$(date '+%Y-%m-%d %H:%M')

# 1) 생존 확인 — 상태코드 + 총 응답시간
read -r status latency <<< "$(curl -sS -o /dev/null -w '%{http_code} %{time_total}' \
  --max-time 15 "$URL" 2>/dev/null || echo '000 0')"

# 2) canonical 실측 — /api/decompose에 canonical 서술 1건 (서비스 실사용 검증)
canonical_desc='매주 월요일 매출 CSV 정리해서 팀장님께 보고서로 올려요'
api_body=$(curl -sS --max-time 60 -X POST "$URL/api/decompose" \
  -H 'Content-Type: application/json' \
  -d "{\"work_description\": \"$canonical_desc\"}" 2>/dev/null)
if printf '%s' "$api_body" | grep -q '"steps"'; then
  canonical="ok"
else
  canonical="fail"
fi

# 3) 비고 판정
note=""
[ "$status" != "200" ] && note="P0: 비정상 상태코드"
[ "$canonical" = "fail" ] && note="${note:+$note, }P0: canonical 실행 실패"

# 4) 로그 append — ops_log.md 없으면 헤더부터 생성
if [ ! -f ops_log.md ]; then
  printf '# Ops log — 운영 루프 (9/21~10/5)\n\n| 시각 | 상태코드 | 지연(s) | canonical | 비고 |\n|---|---|---|---|---|\n' > ops_log.md
fi
printf '| %s | %s | %s | %s | %s |\n' "$NOW" "$status" "$latency" "$canonical" "$note" >> ops_log.md

echo "$NOW status=$status latency=${latency}s canonical=$canonical${note:+ -> $note}"

# P0면 exit 1 (cron에서 알림 또는 devin -p 진단 세션으로 이어짐)
if [ "$status" != "200" ] || [ "$canonical" = "fail" ]; then
  exit 1
fi
exit 0
