#!/usr/bin/env bash
# 将本仓（fonts-front / fonts-front-v4-lab）静态站同步到 feicode 现网目录。
# 公网 app 以 feicode 磁盘为准（经 CyberCDN）；见 docs/ops/DOMAIN-DEPLOY-SOP.md §2。
#
#   ./scripts/deploy-feicode-front.sh                 # dry-run：打包并列出将排除的内容
#   ./scripts/deploy-feicode-front.sh --staging       # 同步到 fonts-front-staging
#   ./scripts/deploy-feicode-front.sh --prod          # staging 验收后同步到 fonts-front
#   ./scripts/deploy-feicode-front.sh --staging --prod  # 先预发再生产（仍建议中间手验）
#
# 环境变量：
#   WF_FEICODE_SSH   默认直连 root@45.117.8.70（国内 Mac 可通；勿默认走 ProxyJump）
#                    需要跳板时再 export WF_FEICODE_SSH=feicode-prod
#   WF_FRONT_STAGING / WF_FRONT_PROD  远端路径
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 国内环境：feicode 22 口对公网开放，Mac 直连比 ProxyJump=weixiaoduo-prod 快一个数量级
SSH_HOST="${WF_FEICODE_SSH:-root@45.117.8.70}"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=30)
# 若误用了带 ProxyJump 的 Host 别名，仍可用 WF_SSH_NO_JUMP=1 强制直连
if [[ "${WF_SSH_NO_JUMP:-1}" == "1" ]]; then
  SSH_OPTS+=(-o ProxyJump=none -o ClearAllForwardings=yes)
fi
STAGING="${WF_FRONT_STAGING:-/www/wwwroot/fonts-front-staging}"
PROD="${WF_FRONT_PROD:-/www/wwwroot/fonts-front}"
SRC_REMOTE="${WF_FRONT_SRC:-/www/wwwroot/fonts-front-oss-sync}"

DO_STAGING=0
DO_PROD=0
DRY=1
for arg in "$@"; do
  case "$arg" in
    --staging) DO_STAGING=1; DRY=0 ;;
    --prod) DO_PROD=1; DRY=0 ;;
    --apply) DRY=0; DO_STAGING=1 ;; # 兼容别名：等同 --staging
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      exit 2
      ;;
  esac
done

# 与 OSS 部署 / SOP §2 对齐：对照页、lab、文档、脚本不进生产树
EXCLUDE=(
  --exclude='.git'
  --exclude='.gitignore'
  --exclude='.cursor'
  --exclude='.lab'
  --exclude='.tmp-shots'
  --exclude='*.bak*'
  --exclude='_kin-*'
  --exclude='lab.html'
  --exclude='*-options.html'
  --exclude='v5-*.html'
  --exclude='oss-audit.html'
  --exclude='node_modules'
  --exclude='.DS_Store'
  --exclude='refs'
  --exclude='docs'
  --exclude='scripts'
  --exclude='deploy'
  --exclude='shots*'
  --exclude='shots-*'
  --exclude='4-update-meta.py'
  --exclude='AGENTS.md'
  --exclude='CLAUDE.md'
)

echo "root=$ROOT ssh=$SSH_HOST dry=$DRY staging=$DO_STAGING prod=$DO_PROD"
echo "exclude: lab / *-options / v5-* / docs / scripts / shots*"

if ! ssh "${SSH_OPTS[@]}" "$SSH_HOST" 'test -d /www/wwwroot' 2>/dev/null; then
  echo "无法 SSH 到 $SSH_HOST（直连）。可试 WF_FEICODE_SSH=feicode-prod 走跳板。" >&2
  exit 1
fi

TMP="$(mktemp -t wf-front-sync.XXXXXX.tgz)"
trap 'rm -f "$TMP"' EXIT

# macOS: 禁 AppleDouble/xattr，避免远端 GNU tar 对 ._app / LIBARCHIVE 关键字失败
export COPYFILE_DISABLE=1
export COPY_EXTENDED_ATTRIBUTES_DISABLE=1

# macOS tar 无 --exclude-vcs 时用显式列表；GNU tar 同样可用
# 优先 gtar（若已装），否则系统 tar + 显式排除 AppleDouble
TAR_BIN=tar
if command -v gtar >/dev/null 2>&1; then
  TAR_BIN=gtar
fi
"$TAR_BIN" -czf "$TMP" -C "$ROOT" \
  "${EXCLUDE[@]}" \
  --exclude='._*' \
  --exclude='.DS_Store' \
  .

BYTES=$(wc -c < "$TMP" | tr -d ' ')
echo "archive=$TMP bytes=$BYTES"

if [[ "$DRY" -eq 1 ]]; then
  echo "dry-run：已打包，未上传。加 --staging 和/或 --prod 才同步。"
  tar -tzf "$TMP" | head -40
  echo "…（共 $(tar -tzf "$TMP" | wc -l | tr -d ' ') 项）"
  exit 0
fi

if [[ "$DO_STAGING" -eq 0 && "$DO_PROD" -eq 0 ]]; then
  echo "未指定 --staging 或 --prod" >&2
  exit 2
fi

echo "→ scp $SSH_HOST:/tmp/wf-front-sync.tgz (direct, no ProxyJump)"
scp "${SSH_OPTS[@]}" "$TMP" "$SSH_HOST:/tmp/wf-front-sync.tgz"

ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
  "DO_STAGING=$DO_STAGING DO_PROD=$DO_PROD STAGING='$STAGING' PROD='$PROD' SRC='$SRC_REMOTE' bash -s" <<'REMOTE'
set -euo pipefail
rm -rf "$SRC"
mkdir -p "$SRC"
# GNU tar: ignore macOS LIBARCHIVE xattr keywords; fail only if extract incomplete
tar --warning=no-unknown-keyword -xzf /tmp/wf-front-sync.tgz -C "$SRC" || {
  echo "tar reported errors; checking critical files..." >&2
  test -f "$SRC/index.html" && test -f "$SRC/data/fonts.json" && test -d "$SRC/js" || exit 1
  echo "critical files present; continuing" >&2
}
# strip any leaked AppleDouble
find "$SRC" -name '._*' -delete 2>/dev/null || true
find "$SRC" -name '.DS_Store' -delete 2>/dev/null || true
if [[ "$DO_STAGING" == "1" ]]; then
  mkdir -p "$STAGING"
  rsync -a --delete "$SRC"/ "$STAGING"/
  echo "synced staging → $STAGING"
fi
if [[ "$DO_PROD" == "1" ]]; then
  if [[ ! -d "$STAGING" ]] || [[ -z "$(ls -A "$STAGING" 2>/dev/null || true)" ]]; then
    echo "警告: staging 为空或不存在，仍按请求写入 prod（建议先 --staging）" >&2
  fi
  mkdir -p "$PROD"
  rsync -a --delete "$SRC"/ "$PROD"/
  echo "synced prod → $PROD"
fi
# 冒烟：本机静态文件存在
test -f "$PROD/index.html" 2>/dev/null || test -f "$STAGING/index.html"
echo "remote ok"
REMOTE

echo "本地验收建议："
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://staging-app.windfonts.com/"
echo "  curl -sS -o /dev/null -w '%{http_code}\\n' https://app.windfonts.com/"
echo "纪律：lab 改完必须 --staging 验收后再 --prod；勿只改本机以为现网已更新。"
