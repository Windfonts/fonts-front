# 现网 API 接入计划

对照日期：2026-09-24。现网是 `app.windfonts.com`（仓 `fonts-vault`）。本仓是公开站和顾客控制台。匿名 GET 大约每天 100 次，不能在每个页面打开时拉全库。

## 不做

- 不把运营后台搬进本仓：字体 / 厂商 / 分类 / 风格增删、OSS 同步、安全开关、域名黑名单、API 密钥管理、IP 白名单。
- 不把目录改成每次进首页就请求 `GET /api/fonts`。
- 不假装现网已有项目、版本、子集工作台、用量、团队、认领、审计接口。这些仍只在本仓 `localStorage`。

## 已完成

- 嵌入地址同时写 `subset` 和 `version`。现网 `version=zh` 会被忽略，`subset` 或 `lang` 才换包（`full` / `zh` / `zh-common` / `en`）。
- 交接 `docs/HANDOFF.md` §3.0 记下现网信封和路径。

## 阶段

### 1. 单款统计（本阶段）

详情页按 `fontFamily` 请求一次 `GET /api/fonts/:family`，把 `viewCount`、`downloadCount`、`apiCallCount` 盖到「统计信息」。同一字体 6 小时内用 `sessionStorage` 缓存。失败就保持本地数字。

现网这几个公开 GET 没有 `Access-Control-Allow-Origin`。浏览器跨域读不到正文。`fonts-vault` 的 `withFontApiAuth` 要给公开响应加上 CORS。未部署前，本地预览仍是本地数字。

### 2. 字符分析（按需）

`GET /api/fonts/:id/analysis` 没有分析文件时返回 404。详情查字仍用本地数据。只在用户点「对照现网字符表」时再请求，不自动拉。

### 3. 目录热度

构建或手动脚本分页拉 `sort=viewCount`，写回 `fonts.json` 的计数字段。不放进页面运行时。匿名配额不够支撑字体库每次筛选都打接口。

### 4. 顾客控制台接口

等 vault 提供项目、域名、用量、上传、团队之后，再换 `wf-app.js` 的 `load/save`。在那之前控制台继续用本机数据。项目 CDN 白名单仍可写 `*.example.com`；REST 免密钥白名单只认完整 hostname，两套不要合成一个表单。

### 5. 上线门闸

登录接现网会话、关掉 `?demo=1`、详情路径 `/fonts/{slug}`、统计以服务端为准。见 `docs/LAUNCH-GATES.md`。
