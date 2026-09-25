#!/usr/bin/env bash
# 将 fonts-front 静态站同步到 OSS 桶 wenfeng-web（广州）。
# 正式域 app.windfonts.com 改绑此桶前，先用本脚本预热内容；DNS 切换另见 DOMAIN-ARCHITECTURE.md。
#
# 依赖：ossutil（或 OSSUTIL 环境变量指向二进制）
# 凭证：环境变量 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET，或 ~/.ossutilconfig
#
#   ./scripts/deploy-oss-front.sh              # dry-run
#   ./scripts/deploy-oss-front.sh --apply      # 实际上传
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUCKET="${WF_FRONT_OSS_BUCKET:-wenfeng-web}"
ENDPOINT="${WF_FRONT_OSS_ENDPOINT:-oss-cn-guangzhou.aliyuncs.com}"
OSSUTIL="${OSSUTIL:-ossutil64}"
APPLY=0
if [[ "${1:-}" == "--apply" ]]; then APPLY=1; fi

if ! command -v "$OSSUTIL" >/dev/null 2>&1; then
  echo "缺少 $OSSUTIL。安装后重试，或 export OSSUTIL=/path/to/ossutil" >&2
  exit 1
fi

# 排除：对照实验、备份、git、临时截图、密钥
EXCLUDE=(
  --exclude .git
  --exclude .gitignore
  --exclude .cursor
  --exclude .tmp-shots
  --exclude "*.bak*"
  --exclude "_kin-*"
  --exclude "lab.html"
  --exclude "*-options.html"
  --exclude "v5-*.html"
  --exclude "oss-audit.html"
  --exclude "node_modules"
  --exclude ".DS_Store"
  --exclude "refs"
  --exclude "docs/*.md"
  --exclude "docs/plans"
  --exclude "docs/ai-context"
  --exclude "scripts"
  --exclude "deploy"
  --exclude "4-update-meta.py"
)

echo "root=$ROOT bucket=oss://$BUCKET endpoint=$ENDPOINT apply=$APPLY"

if [[ "$APPLY" -eq 0 ]]; then
  echo "dry-run（加 --apply 才上传）"
  "$OSSUTIL" cp -r "$ROOT/" "oss://$BUCKET/" -e "$ENDPOINT" --update --dry-run "${EXCLUDE[@]}" 2>&1 | tail -40
  exit 0
fi

"$OSSUTIL" cp -r "$ROOT/" "oss://$BUCKET/" -e "$ENDPOINT" --update --force "${EXCLUDE[@]}"
echo "done. 静态网站 / 自定义域仍须在控制台或 CDN 绑 app；桶 ACL 若禁 public-read，用桶策略或 CDN 回源。"
