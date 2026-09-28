# 新字体入库后必跑流水线

> 每次目录新增 / 改 `normalized` / 换包后执行。漏跑会导致 analysis 缺口、包体预算旧、简繁配对缺、CDN 仍吃旧 metadata。

## 清单（按顺序）

1. **目录入库**  
   更新 `fonts-front/data/fonts.json`（及需要的 `foundries.json` / `font-lineage.json` / `font-products.json`）。提交并推送。

2. **字体包上 CDN**  
   在 `fonts-packages` 完成切包上传，确认  
   `https://cn.windfonts.com/fonts-packages/{Normalized}/{Weight}/full/result.css` 可访问。

3. **重建 analysis**（fonts-packages）  
   ```bash
   cd fonts-packages
   node scripts/build-font-analysis-from-css.mjs
   # 期望 hit ≈ 目录有包款数，ratio → 1
   OSS_UPLOAD_DIRS=./metadata node scripts/upload.js
   ```
   metadata 上传已是 `max-age=300`；仍须换缓存键（下一步）。

4. **重建 package-sizes**（fonts-front）  
   ```bash
   cd fonts-front
   node scripts/build-package-sizes.mjs
   # 同步到 vault：cp data/package-sizes.json ../fonts-vault/data/
   ```

5. **重建 locale 配对**（fonts-front）  
   ```bash
   node scripts/build-locale-fallback-pairs.mjs
   # 同步到 vault：cp data/locale-fallback-pairs.json ../fonts-vault/data/
   ```

6. **递增 `OSS_METADATA_VERSION`**  
   同时改：
   - `fonts-vault/.env.production` 与 `.env.example`
   - `fonts-front/js/wf-proto.js` → `ANALYSIS_META_VER`
   - `fonts-front/js/wf-live.js` → analysis URL `?v=`
   - 现网容器：改服务器 `.env.production` 后 `docker` 重建/重载 env  
   例：`20260925a` → `20260925b`（按日+字母递增即可）。

7. **提交 / 合并 / 部署**  
   - front：`v4-specimen`（或发布分支）  
   - vault：AGit `refs/for/main/...`，用 wapuu token 合 PR；生产拉镜像或热更 data+env

## 验收

| 检查 | 命令 / 期望 |
|---|---|
| analysis 文件 | `curl -sI 'https://cn.windfonts.com/fonts-packages/metadata/font-analysis.json?v=NEWER'` → 200 |
| 单款 analysis API | `curl -s 'https://app.windfonts.com/api/fonts/{Normalized}/analysis'` → 200 或明确 404 |
| package-sizes | `data/package-sizes.json` 含新 `normalized` |
| locale | 有简繁兄弟的产品出现在 `locale-fallback-pairs.json` |
| 嵌入 | `https://cn.windfonts.com/api/css?family=wenfeng-{短码}&weight=regular&subset=zh-common` → 200（许可门禁除外） |

## 外源拉取（origin-fetch SOP）

直连 GitHub / npm / PyPI 在集群里经常挂。**禁止手写单点上游 URL / 临时搜镜像**；统一走共享客户端。

| 入口 | 说明 |
|------|------|
| `origin-fetch get https://…` | 任意 URL（直连 → ghfast / gh-proxy 前缀） |
| `origin-fetch github get / license …` / `gh-fetch …` | GitHub raw / OFL（jsdmirror → jsDelivr → ghfast） |
| `origin-fetch npm PKG[/path] [ver]` | npmmirror / jsDelivr |
| `origin-fetch pypi PKG` | 清华 / 阿里 / 腾讯 / pypi.org |
| `origin-fetch cravatar HASH_OR_EMAIL` | 默认主站 `cravatar.com`（兼顾国内外）；`ORIGIN_REGION=cn\|en` 才走分区（勿写 `cravatar.cn`） |
| `probe-origin-mirrors` | 写 `~/.cache/github-mirrors/health.json` |
| Node | `scripts/lib/github-fetch.mjs`（GitHub 子集；完整能力用 Python CLI） |

许可归档：`staging/<batch>/{Norm}/` + `source.json`（`url` / `sha256` / `via`）。  
镜像全挂：先 `probe-origin-mirrors`，改 `linuxjoy/scripts/lib/origin_fetch.py` 优先链，再：

```bash
bash ~/Projects/linuxjoy/scripts/cluster/deploy-origin-fetch.sh
```

全集群：`~/bin/origin-fetch`、`~/bin/gh-fetch`、`~/scripts/lib/origin_fetch.py`。

## 不要

- 不要只改 OSS 文件却不递增 `?v=`（边缘会钉死旧 JSON）。  
- 不要把动态嵌入改成 `fonts-packages/.../result.css`。  
- 不要在未核实许可时放开 `brand_terms` / `high_risk` 的公共 CSS。  
- 不要为拉外源原文另写一套镜像探针；改共享库 + 重新 deploy。
