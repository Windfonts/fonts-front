#!/usr/bin/env bash
# 公网 app.windfonts.com 静态发版：只认杭州桶 wenfeng-web-hz。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUCKET="${WF_WEB_BUCKET:-wenfeng-web-hz}"
REGION="${WF_WEB_REGION:-cn-hangzhou}"
PROFILE="${WF_WEB_PROFILE:-wenpai}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

STAGE="$ROOT/.deploy-web-hz"
mkdir -p "$STAGE"

echo "== seo prerender =="
python3 "$ROOT/scripts/build-seo.py"

echo "== proto data stamps =="
python3 -c "import re,sys; from pathlib import Path
t=Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace')
for key in ('foundries.json','fonts-list.json','avatars.json','font-lineage.json'):
    hits=sorted(set(re.findall(key+chr(92)+r'?v=[^\"\\047]+', t)))
    print(' ', hits or [key+' (no ?v=)'])
" "$ROOT/js/wf-proto.js"

rsync -a --delete \
  --exclude '.git/' --exclude 'node_modules/' --exclude '.DS_Store' \
  --exclude '*-options.html' --exclude 'v5-*.html' --exclude 'lab.html' \
  --exclude 'oss-audit.html' --exclude 'docs/' --exclude 'scripts/' \
  --exclude 'deploy/' --exclude '*.md' --exclude '.agents/' \
  --exclude '.deploy-web-hz/' --exclude '.deploy-web-hz.tar' --exclude '.gitignore' \
  "$ROOT"/ "$STAGE"/

echo "stage files: $(find "$STAGE" -type f | wc -l | tr -d ' ')"

if [[ "$DRY" == 1 ]]; then
  echo "dry-run, not uploading"
  exit 0
fi

if aliyun oss ls "oss://$BUCKET/" --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  echo "upload local → oss://$BUCKET/"
  aliyun oss --profile "$PROFILE" cp "$STAGE/" "oss://$BUCKET/" --recursive --force --region "$REGION"
else
  echo "no local wenpai oss; ship via devops"
  TAR="$ROOT/.deploy-web-hz.tar"
  COPYFILE_DISABLE=1 tar -C "$STAGE" -cf "$TAR" .
  scp -o BatchMode=yes "$TAR" devops:/tmp/wf-web-hz-ship.tar
  ssh -o BatchMode=yes devops 'set -euo pipefail
d=$HOME/tmp-wf-web-hz-ship
mkdir -p "$d"
tar -C "$d" -xf /tmp/wf-web-hz-ship.tar
aliyun oss --profile wenpai cp "$d/" oss://wenfeng-web-hz/ --recursive --force --region cn-hangzhou
echo OSS_RECURSIVE_DONE
'
fi
echo "done oss://$BUCKET"
