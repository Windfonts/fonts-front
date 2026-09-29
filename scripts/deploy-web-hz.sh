#!/usr/bin/env bash
# 公网 app.windfonts.com 静态发版：只认杭州桶 wenfeng-web-hz。
# 在 fonts-front 仓根执行。Mac 无 wenpai 钥匙时自动拷到 devops 再 oss cp。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUCKET="${WF_WEB_BUCKET:-wenfeng-web-hz}"
REGION="${WF_WEB_REGION:-cn-hangzhou}"
PROFILE="${WF_WEB_PROFILE:-wenpai}"
DRY=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY=1; fi

STAGE="$(mktemp -d /tmp/wf-web-hz.XXXXXX)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

copy_tree() {
  local src="$1" dest="$2"
  mkdir -p "$dest"
  # rsync if present, else python
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --exclude '.git' --exclude 'node_modules' --exclude '.DS_Store' \
      --exclude '*-options.html' --exclude 'v5-*.html' --exclude 'lab.html' \
      --exclude 'oss-audit.html' --exclude 'docs' --exclude 'scripts' \
      --exclude 'deploy' --exclude '*.md' --exclude '.agents' \
      "$src"/ "$dest"/
  else
    python3 - "$src" "$dest" << 'PY'
import os, shutil, sys
src, dest = sys.argv[1], sys.argv[2]
skip_dir = {'.git', 'node_modules', 'docs', 'scripts', 'deploy', '.agents'}
skip_file_suffix = ()
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d not in skip_dir and not d.startswith('.')]
    rel = os.path.relpath(root, src)
    for fn in files:
        if fn.endswith('.md') or fn == '.DS_Store': continue
        if fn.endswith('-options.html') or fn.startswith('v5-') or fn in ('lab.html', 'oss-audit.html'):
            continue
        if fn.endswith('.map'): continue
        sp = os.path.join(root, fn)
        dp = os.path.join(dest, rel if rel != '.' else '', fn)
        os.makedirs(os.path.dirname(dp), exist_ok=True)
        shutil.copy2(sp, dp)
PY
  fi
}

copy_tree "$ROOT" "$STAGE"
# drop leftover dirs that slipped
rm -rf "$STAGE/.git" "$STAGE/docs" "$STAGE/scripts" "$STAGE/deploy" "$STAGE/node_modules" 2>/dev/null || true

echo "stage=$STAGE"
find "$STAGE" -type f | sed "s|^$STAGE/||" | sort | head -40
echo "... $(find "$STAGE" -type f | wc -l | tr -d ' ') files"

if [[ "$DRY" == 1 ]]; then
  echo "dry-run, not uploading"
  exit 0
fi

oss() {
  aliyun oss --profile "$PROFILE" "$@" --region "$REGION"
}

if aliyun oss ls "oss://$BUCKET/" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  echo "upload local → oss://$BUCKET/"
  oss cp "$STAGE/" "oss://$BUCKET/" --recursive --force
else
  echo "no local wenpai oss; ship via devops"
  TAR=/tmp/wf-web-hz-ship.tar
  COPYFILE_DISABLE=1 tar -C "$STAGE" -cf "$TAR" .
  scp -o BatchMode=yes "$TAR" devops:/tmp/wf-web-hz-ship.tar
  ssh -o BatchMode=yes devops "set -euo pipefail
d=\$(mktemp -d /tmp/wf-web-hz.XXXXXX)
tar -C \"\$d\" -xf /tmp/wf-web-hz-ship.tar
aliyun oss --profile $PROFILE cp \"\$d/\" oss://$BUCKET/ --recursive --force --region $REGION
echo OSS_RECURSIVE_DONE
"
fi
echo "done oss://$BUCKET"
