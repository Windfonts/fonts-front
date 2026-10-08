# 文风店面 / 源站 · 大改动后性能检测

跨产品规程：linuxjoy `docs/ops/sop-windfonts-perf.md`（#40）。Mac 路径 `~/Projects/linuxjoy/docs/ops/sop-windfonts-perf.md`。本页是本仓要跑的命令和基线。**app 和 org 都要测。** org 2026-10-08 还没做优化。

```bash
python3 scripts/perf-check.py --all
python3 scripts/perf-check.py --site app
python3 scripts/perf-check.py --site org
python3 scripts/perf-check.py --all --baseline docs/ops/perf-baseline-2026-10-08.json
python3 scripts/perf-check.py --skip-live   # 只扫本仓 JS/CSS 债
```

退出码：`0` 无新债（已知 WARN 算 KNOWN）· `1` 新 WARN · `2` FAIL。零样本不要当 PASS。

## 何时跑

改 `ensureFontCss` / `readyFace` / `pickPackSubset` / 首页字林 / 特点活样张 / `fonts-list.json` 体量 / UI 字 / preload / org `site/assets` 之后，发杭州或发 org dist **前后各一次**。

## 店面合同（相对 #8804）

| 项 | 合同 | 2026-10-08 基线 |
|----|------|-----------------|
| 热路径 | 只拉 `fonts-list.json`，HTML 禁止再拉 `fonts.json` | thin gzip ~91KB / 解压 ~614KB / n=775 |
| 货架 | 列表首屏 `preview-shop` | `/fonts` 仍 shop |
| UI 字 | 普惠体 400+700，preload `PuHuiTi-400.woff2` | 合计约 698KB |
| 分页 | `PAGE_SIZE=10` | 10 |
| 页眉菜单 | `.topnav a` padding `0.4rem 1.5rem`（与 wenfeng.org 相同） | `20261008nav1` |

已知债（基线 `known_warns`，再出现不算新红）：

- `home-forest-needText-textContent`：字林 `el.textContent` 含字体名，shop 升 full
- `features-zh-then-full`：特点页 `'zh'` + 活字，Black 升 full（feat2 故意）
- `org-ui-on-cloudflare`：org 首页 HTML 零条 `cn.windfonts.com`，UI 还在 CF

**不要**未开口改字林 needText 或回退 feat2。Lighthouse 可选，不当唯一门。冷启动与 Clash 缓存重载分开写。

## org

- `.org` **备不了案**（`DEPLOY.md` 2026-10-01）。禁止大陆七 A 上 apex。
- HTML 留 CF/Worker。静态以后才考虑已备案 `cn.windfonts.com`。不要把 org 网页写进 `oss://wenfeng-web-hz`。
- 2026-10-08 首页 HTML ~32KB，UI `/assets/*` 全在 `wenfeng.org`。

## 浏览器补测（脚本代替不了）

硬刷新；`document.documentElement.dataset.scale` 必须空或 `md`，不要 leftover `lg`。数 `fonts-packages/**/result.css` 和 woff2，分 `preview-shop` / `zh` / `zh-common` / `full`。

## 发版

occupancy-safe 杭州：只灌改过的 CSS/JS/HTML + `?v=`。不要整树 `deploy-web-hz.sh`。不要发 `*-options.html` / `v5-*` / `lab.html` / `oss-audit.html`。
