# fonts-vault 目标态线框（Designer → Pro）

**Date:** 2026-09-19 (Asia/Shanghai)  
**定调：** vault 白底/锌色产品壳 + 吸收 next-windfonts 行为（字帖行、共用样句、我的选字、详情舞台）  
**不是：** next 全屏暗底首页皮肤拷贝；不是生产代码。

对照清单：[VAULT-FROM-NEXT-UX.md](../../VAULT-FROM-NEXT-UX.md)

---

## 本地打开

推荐从 **prototypes/** 起服（这样 `../data/fonts.json` 可被 vault-target 页读到）：

```bash
cd /workspace/windfonts-research/prototypes
python3 -m http.server 8765
```

| 页 | URL |
|----|-----|
| 首页 | http://127.0.0.1:8765/vault-target/index.html |
| 列表 | http://127.0.0.1:8765/vault-target/fonts.html |
| 详情 | http://127.0.0.1:8765/vault-target/font-detail.html?id=… |
| 我的选字 | http://127.0.0.1:8765/vault-target/picks.html |

也可只在本目录起服；若读不到 `../data/fonts.json`，JS 回退内嵌约 8 个样例（OFL / 未验证 / 需授权）。

真 webfont：`https://app.windfonts.com/api/css?family=…`（失败时回退系统字体，仍显示样句字形）。

页脚统一标注：**vault 目标态线框 · 参照 next 行为 · 非生产**

---

## 文件

```
vault-target/
  index.html          # P0-6 瘦身首页
  fonts.html          # P0-1/2/4/5 字帖列表
  font-detail.html    # P0-3 舞台详情
  picks.html          # P0-2 我的选字
  css/vault-target.css
  js/vault-target.js
  README.md
```

---

## 映射 VAULT-FROM-NEXT-UX P0

| ID | 项 | 本线框 |
|----|----|--------|
| **P0-1** | 列表字帖行 + 真预览 + sticky 样句/字号 | `fonts.html`：纵向 ItemFont 行（名/作者/样式 + 大字预览）；顶栏 sticky 样句 + 12–108 滑杆；`ensureFontCss` 拉真 CSS |
| **P0-2** | 「我的选字」 | 角标 + `picks.html`；加入/移除/清空；localStorage；袋页共用样句 + 批量复制 link |
| **P0-3** | 详情舞台 | `font-detail.html`：舞台 ≥~40vh 置顶；字重 tabs + 字号；复制 CSS CTA；下载诚实写「通过 CSS 加载」 |
| **P0-4** | 搜索诚实 | 全站 `search=`（兼容读 `q`/`keyword`）；空结果诚实空态，非静默全量 |
| **P0-5** | 许可诚实 | 档位点：`OFL已核` / `需授权` / `未验证`；禁大绿「免费商用」门面 |
| **P0-6** | 首页瘦身 | `index.html`：一句品牌 + 搜索→fonts + 分类 chips（无四宫格）+ 3–6 真字精选行 |

---

## 气质验收要点（给 Tester）

1. `/fonts` 打开即见可辨认真实字形；改样句/字号整表跟变。  
2. 加入选字 → 袋页可见 → 可移除。  
3. 详情复制 CSS 一次成功（family 与现网 API 一致）。  
4. 搜「思源」结果变少，不是假全量。  
5. 列表/精选 **无**「免费商用」大绿徽章；档位点可读。  
6. 视觉：白/锌产品壳，像翻字帖，不像 next 暗底首页或 CMS 功能墙。
