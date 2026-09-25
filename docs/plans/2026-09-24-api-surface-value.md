# 文风对外 API：价值、数据与分期

对照日期：2026-09-24。产品边界与分期如下。本仓已落地项见 §3.1「本仓进度」。

相关：

- 嵌入三轨与参数：`docs/plans/2026-09-24-font-mix-subset-fallback.md` §11–12  
- 现网 vault 路径：`docs/HANDOFF.md` §3.0  
- 本仓接现网：`docs/plans/2026-09-24-app-windfonts-api.md`  
- 嵌入口径硬约束：`.cursor/rules/cdn-embed-contract.mdc`

---

## 0. 共识

| 点 | 结论 |
|---|---|
| 更多 API ≠ 给 `/api/css` 堆查询参数 | 投递保持瘦：`family` / `weight` / `subset`（+ 兼容 `version`） |
| 匿名 `GET …&text=` 即时切字 | **不做** |
| 增量价值 | **机器可读的字体事实** + **可决策的体积** + **可运维的项目/用量** |
| 主机 | 对外示例一律 `cn\|hk\|en.windfonts.com`；禁止默认写成 `app.windfonts.com` |

---

## 1. 三层能力（用户视角）

| 层 | 干什么 | 现网 / 草案 |
|---|---|---|
| **投递** | 页面能显示字 | `GET /api/css` · 项目 `/p/{slug}/index.css`（vault 骨架已通，边缘待 `/p/` 回源）· `POST /v1/subset`（草） |
| **目录** | 工具链能选字、合规、估体积 | vault `GET /api/fonts` · `:id` · `categories` · `brands` · `…/analysis` |
| **控制台** | 项目发布、域名、用量、团队 | HANDOFF `/v1/*` 草案；现网顾客侧仍多在本仓 localStorage |

缺口主要在：把目录与运营做成**稳定、可集成的契约**，而不是再发明嵌入参数。

---

## 2. 价值与数据地图

### 2.1 选型与目录

| 能力 | 用户价值 | 给到的数据 |
|---|---|---|
| 字体详情机读包 | CMS / 设计系统 / 选字插件 | `family` 短码、中英名、字重、分类、厂商、许可摘要、开源/RFN、谱系上游、可否网页嵌入 |
| 覆盖 / 字符表 | 「文案缺不缺字」 | 码点覆盖、相对常用字缺口、与上游差；现网有 `…/analysis` |
| 许可与证据 | 法务一次拉齐 | 许可名、URL、署名、RFN、嵌入是否允许、证明链摘要 |
| 谱系 | 派生款 + 补全决策 | `upstream`、`group`、同系、建议 fallback `family` |
| 搜索 | 按场景找字 | 命中列表 + 标签 / useCases（NL 搜索后置） |
| 厂商主页机读 | 品牌站、认领后 CMS | 简介、外链、旗下字体、认领状态 |

### 2.2 体积与嵌入决策

| 能力 | 用户价值 | 给到的数据 |
|---|---|---|
| 包体预估 | 首屏 / 带宽预算 | 按 `subset` 的 CSS+分片字节、片数、相对 `full` 比 |
| 推荐 subset | 非专家少踩 `full` | 枚举建议 + 短理由 |
| 多字体组合检查 | 谱系补全 / 混搭前自检 | 字重对齐、许可是否都可嵌入、体积叠加 |

### 2.3 项目与运维

| 能力 | 用户价值 | 给到的数据 |
|---|---|---|
| 用量 | 账单、容量、异常 | 请求、字节、按字体/域名/项目、状态码、盗链 host |
| 域名与拦截 | 防盗链排障 | 白名单、验证结果、403 聚合 |
| 版本与发布 | CI 推子集、回滚 | 版本号、字节、current、回滚结果 |
| 审计 / 团队 | 代理商、多人 | 操作者、密钥轮换 |

### 2.4 生态（更后）

Webhook、OAuth 应用令牌、签名限频的 catalog dump → 让文风出现在别人的产品里。

### 2.5 画像 → 优先数据

| 用户 | 最需要 | 核心数据 |
|---|---|---|
| 前端 / 建站 | css + 预估 + 推荐档 | 短码、字重、subset、字节 |
| 设计系统 / CMS | 详情 + 覆盖 + 许可 | 机读元数据、缺字、合规 |
| 市场 / 品牌 | 项目 URL + 用量 | `/p/…`、流量、盗链 |
| 开源作者 / 厂商 | 厂商 + 认领 + 引用 | 归属、认领态、apiCall/view |
| 代理商 | 团队 + 审计 + 分项目用量 | 隔离与账单拆分 |

---

## 3. 分期：现在能做 / 近后续 / 更后

判断标准：

- **现在**：现网已有端点或本仓已有数据；只差文档、CORS、边缘回源、字段对齐或纯前端接线；不新开控制台后端。  
- **近后续**：要 vault 小改或建表，但数据源已在本仓 / OSS 包上，契约可先写死。  
- **更后**：依赖顾客控制台后端、计量管道或生态合作，单独立项。

### 3.1 现在能做（优先，未全部开工）

| # | 项 | 价值 | 依赖 | 备注 |
|---|---|---|---|---|
| N1 | **CDN `/api/css` 边缘回源 vault** | 用户复制的 cn/hk/en 链接可用 | CyberCDN / infra | **已通（2026-09-25）**：`cn.windfonts.com/api/css` → vault；OSS 静态仍走原路径；不改 URL 形态 |
| N2 | **公开目录 API 开 CORS** | 浏览器 / 插件能读 `fonts` / `:id` / `analysis` | fonts-vault | **已通**：`Access-Control-Allow-Origin: *`（匿名配额仍约 100 次/天） |
| N3 | **把现网目录 API 写成正式契约** | 集成方知道字段与信封 | 文档 | `docs.html` 已补信封 / 配额 / CORS 说明与详情稳定字段表 |
| N4 | **详情页拉单款计数** | 站内展示真实热度 | N2 | **本仓已接线**（`wf-live.js`）；N2 CORS 已通，可拉现网计数 |
| N5 | **构建期同步热度进 `fonts.json`** | 列表不打运行时 API | 脚本 + 配额 | **已做**：`scripts/sync-font-counts.mjs`（默认 ssh 查库）；写入 `viewCount`/`downloadCount`/`apiCallCount` |
| N6 | **按需对照 `…/analysis`** | 开发者可核验字符表 | N2；无文件则 404 | **已做**：详情「对照现网字符表」；限流回退 OSS metadata；现网 analysis ≈ 128/471 款（稀） |
| N7 | （预留） | | | |
| N8 | **许可 / 谱系导出** | 合规台账 | | **已做** |
| N7 | **嵌入生成器：档位默认 + 多 `family`** | 立刻减少误用 `full`、服务谱系补全 | 仅前端 | **本仓已做**：四档 chip、默认 `zh-common`；有库内上游时可勾选 `family=主\|上游` |
| N8 | **本仓许可 / 谱系数据保持可导出** | 给 vault 同步或静态 dump 预留 | 已有 `fonts.json` / `font-lineage.json` / 许可库 | **已做**：`scripts/export-license-lineage.mjs` 导出机读快照 |

### 3.1a 本仓进度（2026-09-24）

| 项 | 状态 |
|---|---|
| N3 文档契约摘要 | 已写入 `docs.html` `#api` / `#api-fonts` / `#params` |
| N4 详情 live 计数 | 已接线；CORS 已通，可拉现网计数 |
| N7 四档 + 谱系补全勾选 | 已上详情「使用」区与选字袋档名对齐 |
| N1 CDN `/api/css` 回源 | **已通**（devops ansible `origin_upstream: windfonts_vault`） |
| N2 公开 CORS | **已通**（fonts-vault 生产） |
| N5 构建期热度 | **已做**（`scripts/sync-font-counts.mjs`，本轮已跑 439 款） |
| N6 analysis 对照 | **已做**（详情按需按钮 + WFLive.analysis） |
| N8 许可/谱系导出 | **已做**（`scripts/export-license-lineage.mjs`） |
| localeFallback 配对 | **已通**（8 对 / 含狮尾简繁、思源、霞鹜） |

**现在不做实现、但现在就要写进契约的「字段期望」（供 vault 下轮同步）：**

详情机读包建议稳定暴露（名称可与 vault 现字段映射）：

`family`（wenfeng-短码）、`name` / `en`、`weights[]`、`normalized`、`category`、`brand` / `foundry`、`license` / `licenseName` / `licenseUrl`、开源/RFN 摘要、`glyphCount` / `charCount`、`useCases` / `tags`、计数三件套。

谱系、证明链可先做「有则返回、无则省略」，避免假字段。

### 3.2 近后续（契约可先定，实现跟 vault / 包清单）

| # | 项 | 价值 | 为何不是「现在」 |
|---|---|---|---|
| P1 | **详情补齐许可 + 谱系字段**（或 `GET …/license`、`…/lineage`） | CMS / 法务机读 | vault 需从本仓许可库与 `font-lineage.json` 同步；现网详情字段尚未对齐 |
| P2 | **`analysis` 产品化（coverage）** | 缺字决策 | 现网 analysis ≈ 128/471；详情字符表真源已是 CSS `unicode-range`；补文件属 fonts-packages 管线 |
| P3 | **包体清单 / `estimate?subset=`** | 选型算体积 | **已做**：`data/package-sizes.json`（~438 款）+ `GET /api/fonts/:id/estimate`；预算条优先 CSS 档字节 |
| P4 | **推荐 subset（规则版）** | 降 `full` 误用 | 依赖 P3 或固定启发式；可先做文档 + 前端，再升 API |
| P5 | **厂商 `foundries/{id}` 丰富化** | 厂商页 / 认领预备 | brands 已有列表；缺旗下字体聚合与认领态 |
| P6 | **关键词搜索 API 硬化** | 工具链搜字 | vault 列表已有 `search=`；先文档化行为，NL/AI 另案 |

近后续仍**坚持**：自由文案切字只走鉴权编译，不进公开 GET。

### 3.3 更后（控制台与生态立项后）

| # | 项 | 价值 | 前置 |
|---|---|---|---|
| L1 | 项目 CDN `GET /p/{slug}/index.css` | 品牌长尾稳定嵌入 | **已通**（vault + 边缘 `/p/` + 自签 Key 发布） |
| L2 | `POST /v1/subset`（Bearer） | CI / 脚本按文案编译 | 编译队列、结果落哈希 URL |
| L3 | 用量 / 域名 / 版本 / 回滚 API | 可运维 CDN | 边缘日志、计量、顾客账号 |
| L4 | 团队 / 认领 / 审计 | 厂商与代理商 | 账号体系、工单 |
| L5 | 多字体组合检查 API | 混搭自检 | P1+P3；也可长期保持前端规则 |
| L6 | Webhook / OAuth 应用令牌 / catalog dump | 生态嵌入 | L1–L3 稳定后 |
| L7 | 自然语言选字、截字图等 | 体验加分 | 非主业；单独评估成本 |

顾客控制台在 vault 提供 L1–L4 之前，**继续本仓 localStorage**（见 `app-windfonts-api.md` 阶段 4），不假装现网已有。

### 3.4 刻意不做

| 想法 | 态度 |
|---|---|
| 匿名 `text=` / `chars=` 挂 `/api/css` | 不做 |
| `charset=` / `purpose=` 改短码模型 | 须另批点头（FAMILY-VARIANTS） |
| 详情 HTML 当 API | 不做 |
| 开放原始字体文件下载 API | 慎；开源链上游，商业走授权 |
| 泛 AI 聊天 API | 不做 |

---

## 4. 建议推进顺序（讨论用）

```
N1 边缘回源 ──┬─→ 投递可信
N2 CORS ──────┼─→ N3 契约文档 → N4 详情计数 / N6 analysis 按需
N5 构建期热度 ─┘
N7 前端嵌入体验（档位默认、多 family）     ← 不阻塞 vault
N8 许可/谱系数据质量 → P1 字段进详情
P3 包体清单 → P4 推荐档（先前端后 API）
────────── 控制台后端就绪后 ──────────
L1 项目 CSS → L2 鉴权子集 → L3 用量域名 → L6 生态
```

---

## 5. 一句话

**现在**：打通投递（回源）+ 放开已有目录 API（CORS/契约/节流使用）+ 前端用好四档与多 family。  
**近后续**：许可、谱系、覆盖、包体进机读字段。  
**更后**：项目、编译、用量、生态。  
**始终**：丰富能力放目录与控制台 API，不放进公开 `/api/css` 查询串。
