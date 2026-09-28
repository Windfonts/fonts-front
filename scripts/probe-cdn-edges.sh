#!/usr/bin/env bash
# 十边抽查：app + cn /api/css（不依赖 vault 进程语义的 /gateway/health 另见 SOP）
set -euo pipefail
EDGES=(
  $(dig +short cn.windfonts.com A 2>/dev/null | sort -u)
)
if [[ ${#EDGES[@]} -eq 0 ]]; then
  echo "未能解析 cn.windfonts.com A 记录" >&2
  exit 1
fi
echo "edges (${#EDGES[@]}): ${EDGES[*]}"
fail=0
for ip in "${EDGES[@]}"; do
  app=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 15 \
    --resolve "app.windfonts.com:443:${ip}" "https://app.windfonts.com/" || echo ERR)
  css=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 20 \
    --resolve "cn.windfonts.com:443:${ip}" \
    "https://cn.windfonts.com/api/css?family=wenfeng-ibmps&weight=regular&subset=en" || echo ERR)
  p=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 15 \
    --resolve "cn.windfonts.com:443:${ip}" "https://cn.windfonts.com/p/demo/index.css" || echo ERR)
  printf '%-16s app=%-4s css=%-4s /p/demo=%-4s\n' "$ip" "$app" "$css" "$p"
  if [[ "$app" != "200" || "$css" != "200" || "$p" != "200" ]]; then
    fail=1
  fi
done
exit $fail
