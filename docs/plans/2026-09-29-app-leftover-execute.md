# app.windfonts.com leftover 执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (this session already chose inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把自评里仍开着的店面缺口做完并上公网：`/app` 壳跟现网 chrome、发版口径与 16016 一致、shop CSS 缓存头查清并修、清缓存脚本离开文档枝、浏览器点过样张路径。

**Architecture:** 访客 HTML/JS 只认杭州 `oss://wenfeng-web-hz` + zone `windfonts_app`。字形包在 `wenfeng-fonts`，列表走 `preview-shop` → `zh` → `full`。禁止匿名 `GET /api/css?text=` 切子集。仓是 fonts-front `main`；linuxjoy 清缓存改动必须独立枝，禁止写进 `feat/document-wordpress-guide` 或直接倒 `origin/main`。

**Tech Stack:** 静态 HTML/JS、OpenResty 边缘 rewrite、阿里云 OSS（devops `aliyun --profile wenpai`）、CyberCDN named-file purge、launchd `com.windfonts.lfl-preview`。

**硬约束（已拍，不要翻）：**

- 不合 `v4-specimen` / `fonts-front-v4-lab`
- 不公开按字切的 `text=` 子集接口（现网该参数被忽略、回 named full，保持这样；不要新开现场切）
- URL 路径段只允许 `[A-Za-z0-9_-]`
- 嵌入 `cn/hk/en.windfonts.com/api/css` 具名包
- 不绕登录扒 26 款 `filePending`
- 不重写 `CATALOG-COPY.md`
- 不把 `wenfeng.org` 做成店面
- 页脚不加厂商认领

---

## 文件

| 文件 | 职责 |
|------|------|
| `app/*.html` | 控制台壳。现网 proto/chrome 停在 09-25/27，必须跟店面 `g14` / `ui11` |
| `docs/LAUNCH-GATES.md` | 删 `python3 -m http.server 16016` |
| `docs/ops/DOMAIN-DEPLOY-SOP.md` | §2.2 已登记 `windfonts_app`；§2.4 shop 字表现状 |
| `docs/plans/2026-09-29-app-front-closeout.md` | 进度改成现网事实 |
| `js/wf-proto.js` | shop CSS `?v=20260929shop2`；`hasCjkFace` / `setSample` |
| `scripts/deploy-web-hz.sh` | 唯一公网静态发版 |
| fonts-packages `scripts/upload-preview-shop.js` | 上传时写 `max-age=86400`（未进 git） |
| fonts-packages `scripts/upload.js` | 默认 `max-age=31536000`（CDN 现网头与此一致） |
| linuxjoy `scripts/lib/cybercdn_url_purge.py` | `HOST_TO_ZONE` 含 `app.windfonts.com` → `windfonts_app`（`0887c4f`，只在本机文档枝） |

## 本轮不做（记账，另开会话）

1. 26 `filePending` 入库（登录墙；Shippori 可走公开 GitHub，仍另开）
2. `CATALOG-COPY` 全量简介
3. 菲码 `licenseFileUrl` 约 148 条 403（要换托管，不是改一行 URL）
4. vault `feat/admin-font-certs` 整枝推（ahead 15 behind 1，混着证书后台）
5. 关掉 `/api/css?text=` 这个 URL（参数已忽略；关入口要 API 会话）
6. HarmonyOS `licenseName` 已是协议全称；`license` 分类仍是「免费商用」，改分类另拍
7. 边缘 ansible `location = /app` 回写 devops 真源（现网已 reload；仓内 linuxjoy 无 ansible 副本可改）

## 现网基线（2026-09-29 自评后复测）

- 店面 `/` `/fonts` `/fonts/harmony` `/foundry/huawei` `/docs`：`wf-proto.js?v=20260929g14`，markup 无 `.html` href
- `/foundry/华为` HTML 200，不是 OSS XML
- `/app` 无斜杠 200 HTML，但 stamp 是 `pro1` / `20260927e`
- 16016 launchd 已跑 `preview-local.py` 对 main
- 薄表 574；`charCount=1` 公网 0；AAR=95
- Albbpht shop CSS `Cache-Control: max-age=31536000`
- Qhddl / Xxzt：`preview-shop` 200、`zh-common` 404、`full` 200
- `text=` 与不带 `text=` 字节相同（full 包）

---

### Task 1: 发版口径与门闸改成现网

**Files:**

- Modify: `docs/LAUNCH-GATES.md:4`
- Modify: `docs/ops/DOMAIN-DEPLOY-SOP.md:52` 以及 §2.4 若仍写「现网 shop 盖不住春绿岸」
- Modify: `docs/plans/2026-09-29-app-front-closeout.md` 进度段

- [ ] **Step 1: 改 LAUNCH-GATES 预览句**

把第 4 行：

```markdown
> 对照现网：`app.windfonts.com`。原型预览：`python3 -m http.server 16016`。
```

改成：

```markdown
> 对照现网：`app.windfonts.com`。本地预览：`python3 scripts/preview-local.py --port 16016`（fonts-front **main** + 干净 URL）。不要 `python3 -m http.server 16016` 指 lab。
```

- [ ] **Step 2: 改 SOP §2.2 清缓存句**

把：

```markdown
`cybercdn-url-purge.py` 尚未登记 `app.windfonts.com`。
```

改成：

```markdown
linuxjoy `scripts/lib/cybercdn_url_purge.py` 的 `HOST_TO_ZONE` 已把 `app.windfonts.com` / `staging-app.windfonts.com` 指到 zone `windfonts_app`。该文件若只在本机文档枝，不算集群真源；进独立 ops 枝后再当工具用。HTML key 无 `:g1`；JS/CSS key 带 `?v=` 和 `:g1`。
```

§2.4 若仍写 41 字盖不住春绿岸：改成「shop 包已按 `preview-packs.json` 重切并带 `?v=20260929shop2`；unicode-range 仍盖不住时 `ensureFontCss` 升 zh/full。Qhddl/Xxzt 无 zh-common，升 full。」

- [ ] **Step 3: 刷新 closeout 进度**

`docs/plans/2026-09-29-app-front-closeout.md` 进度改为：公网 proto `g14`；整站已灌 hz；shop 已上传；P1 `/app` 无斜杠已通、**stamp 未跟**；P2 目录债仍开。不要把「shop 重切进行中」留着。

- [ ] **Step 4: 核对没有 http.server 16016 当口径**

Run:

```bash
rg -n 'http.server 16016' docs/LAUNCH-GATES.md docs/ops/DOMAIN-DEPLOY-SOP.md
```

Expected: 只出现在「不要再用」的否定句。

---

### Task 2: `/app` 壳 stamp 跟店面 chrome

**Files:**

- Modify: `app/*.html`（14 个公网壳；不要动 `*-options.html`）
- 目标戳：`js/wf-proto.js?v=20260929g14`、`js/wf-chrome.js?v=20260929ui11`
- `app/fonts.html` 的 `wf-specimen.js` 无 query，改成 `js/wf-specimen.js?v=20260929ui14`

控制台仍是 demo（`wf-app.js?v=20260926demo1`、`?demo=1`）。本任务只让 href / 目录 / 样张脚本与店面同一份，不假装登录已通。

- [ ] **Step 1: 列出将改的 stamp**

Run:

```bash
rg -n 'wf-proto.js\?v=|wf-chrome.js\?v=|wf-specimen.js' app --glob '*.html'
```

Expected: proto 为 `20260925pro1` / `pro2` / `20260927nourl2`；chrome 为 `20260927e` / `nourl2`；`app/fonts.html` specimen 无 `?v=`。

- [ ] **Step 2: 批量替换 proto / chrome**

在 `app/` 下把下列旧戳换成新戳（只改 script src，不改控制台业务脚本）：

```
wf-proto.js?v=20260925pro1  → wf-proto.js?v=20260929g14
wf-proto.js?v=20260925pro2  → wf-proto.js?v=20260929g14
wf-proto.js?v=20260927nourl2 → wf-proto.js?v=20260929g14
wf-chrome.js?v=20260927e     → wf-chrome.js?v=20260929ui11
wf-chrome.js?v=20260927nourl2 → wf-chrome.js?v=20260929ui11
```

`app/fonts.html`：

```html
<script src="/js/wf-specimen.js"></script>
```

改成：

```html
<script src="/js/wf-specimen.js?v=20260929ui14"></script>
```

- [ ] **Step 3: 本地 16016 核对**

```bash
curl -sS http://127.0.0.1:16016/app | grep -oE 'wf-(proto|chrome)\.js\?v=[^"]+'
curl -sS http://127.0.0.1:16016/app/fonts.html | grep -oE 'wf-specimen\.js[^"]*'
```

Expected: `g14` / `ui11` / `ui14`。

---

### Task 3: 提交 fonts-front 文档 + app 戳并灌桶

**Files:** Task 1–2 的文件。仓：`~/Projects/fonts-front` `main`。

- [ ] **Step 1: 只 stage 本任务文件**

```bash
cd ~/Projects/fonts-front
git add docs/LAUNCH-GATES.md docs/ops/DOMAIN-DEPLOY-SOP.md \
  docs/plans/2026-09-29-app-front-closeout.md \
  docs/plans/2026-09-29-app-leftover-execute.md \
  app/*.html
git diff --cached --stat
```

不要 add `*-options.html`、`data/*.bak*`、lab。

- [ ] **Step 2: 提交**

```bash
git commit -m "$(cat <<'EOF'
fix(front): /app 壳跟 g14/ui11；门闸预览改 preview-local

控制台 HTML 不再引用 09-25 proto / 09-27 chrome。
LAUNCH-GATES 去掉 http.server 16016。
EOF
)"
```

- [ ] **Step 3: 推 main 再灌 hz**

```bash
git push origin main
bash scripts/deploy-web-hz.sh
```

Expected: 脚本打印 `OSS_RECURSIVE_DONE` 或 `done oss://wenfeng-web-hz`。

- [ ] **Step 4: 公网核对（不够 200）**

```bash
curl -sS https://app.windfonts.com/app | grep -oE 'wf-(proto|chrome)\.js\?v=[^"]+'
curl -sS https://app.windfonts.com/ | grep -oE 'wf-proto.js\?v=[^"]+'
```

Expected: `/app` 与首页都是 `20260929g14`。HTML 缓存约 1m，MISS/REVALIDATED 均可，内容必须是新戳。

---

### Task 4: shop CSS 一年缓存 — 先分清 OSS 头还是边缘改写

**Files:**

- Read: `~/Projects/fonts-packages/scripts/upload-preview-shop.js:70`
- Read: `~/Projects/fonts-packages/scripts/upload.js:109-116`
- 现网：`https://cn.windfonts.com/fonts-packages/Albbpht/Regular/preview-shop/result.css`

- [ ] **Step 1: 读 OSS 对象头（devops，字体桶）**

```bash
ssh -o BatchMode=yes devops 'aliyun oss --profile wenpai stat \
  oss://wenfeng-fonts/fonts-packages/Albbpht/Regular/preview-shop/result.css'
```

记下 `Cache-Control`。同时：

```bash
curl -sSI --max-time 15 --noproxy '*' \
  https://cn.windfonts.com/fonts-packages/Albbpht/Regular/preview-shop/result.css \
  | tr -d '\r' | grep -iE 'HTTP/|cache-control|age:|x-cache'
```

- [ ] **Step 2: 按结果分支（只走一条）**

**A. OSS 已是 `max-age=86400`，CDN 回 `31536000`：** 边缘在改写字体 CSS 头。店面继续靠 `?v=20260929shop2`。在 SOP §2.4 写一句「CDN 对 woff2/css 输出一年；换包必须 bump query」。不要为改 TTL 去动全集群 `expires`。

**B. OSS 也是 `31536000`：** `upload-preview-shop.js` 的 86400 没写进对象（后写被 `upload.js` 覆盖，或从未 `--apply` 成功）。只 copy-object 改 CSS 头，不要重传 1 万个 woff2：

```bash
# 在 devops 上对 preview-shop/result.css 做 set-meta（先 dry 列出 key）
aliyun oss --profile wenpai set-meta \
  oss://wenfeng-fonts/fonts-packages/Albbpht/Regular/preview-shop/result.css \
  Cache-Control:public,max-age=86400 --update
```

先 1 个 key 验收，再批量 CSS（不含 woff2）。批量脚本另提交到 fonts-packages，禁止解释器跑 `/tmp` 删除。

**C. 对象不存在 / 404：** 包名用目录 `normalized`（Harmony 是 `Harmony` 不是 `Harmonyos`）。

- [ ] **Step 3: 把 `upload-preview-shop.js` 和 `build-preview-pack.py` 纳入 fonts-packages git**

这两个文件现在是 untracked，但已经用过。提交时不要带 `_upstream-src/`、`_wave1_park/`、`logs/`、`urls.json.bak*`。

```bash
cd ~/Projects/fonts-packages
git add scripts/upload-preview-shop.js scripts/build-preview-pack.py config/preview-packs.json
git commit -m "feat: preview-shop 重切与上传脚本（CSS max-age=86400）"
```

若 `config/preview-packs.json` 与已跟踪文件重复，先 `git diff` 再决定。

---

### Task 5: linuxjoy 清缓存脚本离开文档枝

**Files:**

- Source commit: `0887c4f` on local `feat/document-wordpress-guide`
- Create: worktree 枝 `grok/windfonts-app-purge`
- **不要** `git push origin main`（`origin/main` 停在 2026-09-06）
- **不要** 把这次改动叠进 `feat/document-wordpress-guide` 的其它 26 个 commit

linuxjoy 当前被其它会话占着（wpslug）。本任务用 **新 worktree**，不在被占 checkout 里 commit。

- [ ] **Step 1: 从 `0887c4f` 只取出 purge 文件，在独立 worktree 建枝**

```bash
cd ~/Projects/linuxjoy
git fetch origin
# 以 feat 枝上 0887c4f 的父提交之前、仅含该文件的方式：
git worktree add -b grok/windfonts-app-purge \
  /tmp/linuxjoy-windfonts-app-purge origin/feat/document-wordpress-guide
# 若 origin/feat 还没有 0887c4f：worktree 建好后 cherry-pick 0887c4f
cd /tmp/linuxjoy-windfonts-app-purge
git cherry-pick 0887c4f
```

若 cherry-pick 冲突只保留 `scripts/lib/cybercdn_url_purge.py` 里 `app.windfonts.com` / `staging-app` 两行映射。

**禁止** worktree 路径用 leftover GC 风格的 python `rmtree`。用 `git worktree add`。目录不要放 `~/Projects` 业务树。若 `/tmp` 被 danger-cmd-block 拦，改用 `~/wt/linuxjoy-windfonts-app-purge`。

- [ ] **Step 2: 单元核对映射**

```bash
python3 - <<'PY'
import importlib.util
from pathlib import Path
p = Path("scripts/lib/cybercdn_url_purge.py")
# 文件依赖 lib.cybercdn_wordpress_cache；只断言源码映射，不 import 跑边。
t = p.read_text()
assert '"app.windfonts.com": "windfonts_app"' in t
assert '"staging-app.windfonts.com": "windfonts_app"' in t
print("ok mapping")
PY
```

- [ ] **Step 3: 推独立枝，不推 main**

```bash
git push -u origin grok/windfonts-app-purge
```

在 SOP 里写枝名。本会话不把文档枝的另外 27 个 commit 一起推。

---

### Task 6: 浏览器点样张路径（curl 不算过）

用 Playwright MCP 或本机 Chrome。视口桌面 1280 与窄屏 390 各走一遍公开路径。

- [ ] **Step 1: 公开店面**

打开：

1. `https://app.windfonts.com/` — 大标题是该款面；「浏览字体库」href=`/fonts`
2. 点「换一款」— 标题换 family 且不是系统黑体混排
3. `https://app.windfonts.com/fonts` — 第一屏不是 AAR/Thai 顶着「春风又绿江南岸」；有汉字面在前
4. 预览框输入「春风又绿江南岸」— 网络里出现 zh 或 full 的 `result.css`（或 unicode-range 已覆盖则留 shop）
5. 点一枚无汉字卡（AAR）— 样张拉丁句，可见「无汉字」
6. `https://app.windfonts.com/fonts/harmony` — 不请求 `/fonts/js/`；详情版心不是一句灰字
7. `https://app.windfonts.com/foundry/huawei` — 厂商页，地址栏保持 ASCII
8. `https://app.windfonts.com/app` — proto `g14`；无 OSS XML

- [ ] **Step 2: 失败则修再点**

若 AAR 仍显示中文诗句：查 `sampleForFont` 是否被列表渲染绕过。若 `/fonts/js/` 404：该页 HTML 相对路径，补 `<base href="/">` 或根路径 `/js/`。

- [ ] **Step 3: 本地 16016 对同一路径**

`http://127.0.0.1:16016/fonts`、`/fonts/harmony`、`/foundry/huawei`、`/app` 均 200 且 stamp 与仓一致。

---

### Task 7: Qhddl / Xxzt 升包路径（验证，不造 zh）

这两款 `preview-shop` 已 200、`zh-common` 404、`full` 200。列表 `shop → zh → full` 会打一次 zh 404 再 full。

- [ ] **Step 1: 确认 proto 在 zh 404 时会请求 full**

读 `js/wf-proto.js` `ensureFontCss`：shop 盖不住 → zh → full。404 不得卡住「正在加载字体」。

- [ ] **Step 2: 打开 `/fonts` 搜「权衡度量」**

样张最终是该款面。允许先 404 zh。不要为两款单独切 zh-common，除非 shop unicode-range 盖不住默认诗句。

---

## 验收命令汇总

```bash
curl -sS https://app.windfonts.com/ | grep -oE 'wf-proto.js\?v=[^"]+'
curl -sS https://app.windfonts.com/app | grep -oE 'wf-proto.js\?v=[^"]+'
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://app.windfonts.com/app
curl -sS -o /dev/null -w '%{http_code}\n' https://app.windfonts.com/foundry/huawei
curl -sSI https://cn.windfonts.com/fonts-packages/Albbpht/Regular/preview-shop/result.css | grep -i cache-control
curl -sS http://127.0.0.1:16016/fonts | grep -oE 'wf-proto.js\?v=[^"]+'
```

首页与 `/app` 必须同为 `20260929g14`。`/app` Content-Type 是 `text/html`。

## 提交约定

- fonts-front：只 add 本计划文件 + 改过的 `app/*.html` + 三份 docs。message 用 `fix(front):`
- fonts-packages：只 add shop 脚本与 pack 配置。不要 `_upstream-src/`
- linuxjoy：只在 `grok/windfonts-app-purge` worktree。不在 `feat/document-wordpress-guide` 再叠 commit
