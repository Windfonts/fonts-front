# app.windfonts.com 收口计划（2026-09-29）

对照自评：硬约束大多已在公网；缺口是发版纪律、样张必须是该款面、清缓存、控制台 URL。

**硬约束（已拍，不要翻）：** 禁止匿名 `GET /api/css?text=`；预计算包进 `wenfeng-fonts`；前台进 `wenfeng-web-hz`；不把 `v4-specimen` 合进产；URL 路径段只允许 `[A-Za-z0-9_-]`；嵌入 `cn/hk/en.windfonts.com/api/css`。

## 文件

| 文件 | 职责 |
|------|------|
| `scripts/deploy-web-hz.sh` | 从 main 灌杭州网页桶（唯一公网发版入口） |
| `docs/ops/DOMAIN-DEPLOY-SOP.md` §2.5 | 发版口径指向该脚本 |
| `js/wf-proto.js` | `hasCjkFace` / `sampleForFont`；slug 已 ASCII |
| `js/wf-specimen.js` | 行样张用 `sampleForFont` |
| `js/pages/fonts.js` | 推荐排序：有汉字面的排前面 |
| linuxjoy `scripts/lib/cybercdn_url_purge.py` | `app.windfonts.com` → zone `windfonts_app` |

## 进度（2026-09-29 晚）

- P0 样张/排序/发版脚本：已上公网。
- **整站灌桶**：`deploy-web-hz.sh` → `oss://wenfeng-web-hz`。公开店面 proto `g14`、chrome `ui11`、specimen `ui14`。
- P1 控制台 `/app` 无斜杠：边缘 rewrite 200 HTML。`WFChrome.href` 在 `/app/` 下前缀 `app/`。**壳 stamp 在 leftover 执行里跟到 g14/ui11**（执行计划 `2026-09-29-app-leftover-execute.md`）。
- P1 换一款：`liveNext` → `applyLive` 已带 `live.textContent`。
- P1 发版脚本打印 foundries/list 戳。
- P2 shop 重切：已上传；CSS `?v=20260929shop2`。CDN `Cache-Control` 现测一年，以 leftover 计划 Task 4 为准。
- P2 目录债：`docs/plans/2026-09-29-catalog-debt.md`。26 filePending 仍开。公网薄表 `charCount=1` 已为 0（cmap 回填，不是 vault 重导）。简介全量重写仍冻结。

## P0 本会话做

### 1. 整站发版脚本
- 只上传公网静态：`*.html`（排除 `*-options.html` `v5-*` `lab.html` `oss-audit.html`）、`css/` `js/` `data/` `assets/` `app/`
- 目标 `oss://wenfeng-web-hz`，`aliyun --profile wenpai --region cn-hangzhou`
- Mac 无 wenpai 钥匙时：打包到 devops 再 `oss cp -r`
- SOP §2.5 改为跑此脚本，单文件 `cp` 只保留紧急补丁

### 2. 样张必须是该款面
- `hasCjkFace(font)`：`languages` 含中/日/韩，或 `charCount>=1000`，或名称含汉字。拉丁名且 `charCount<200` 且语言空 = 无汉字面（AAR/Thai/Viet）
- 无汉字面 + 当前样张含汉字 → 该行改用 `The quick brown fox 0123`，不要系统黑体假扮
- 用户输入拉丁字母时，所有行仍显示用户输入
- 推荐排序：有汉字面的在前，再按名称

### 3. 清缓存登记
- `HOST_TO_ZONE["app.windfonts.com"] = "windfonts_app"`
- HTML key 无 `:g1`；JS/CSS key 带 `?v=` 和 `:g1`

## P1（进行中）

4. 控制台 `app/*.html` 链：能走 `href()` 的走 `livePagePath`；边缘若无 `/app/{page}` fallback 则先 `$uri.html`
5. 首页「换一款」后大标题再跑 `ensureFontCss(..., live.textContent)`（已接线则只验收）
6. `foundries.json?v=` 与目录薄表 `list` 戳在发版脚本里打印，避免漏 bump

## P2 另开会话

7. 扩 preview-shop 字表（默认短句 + 首页标题），不要公开 `text=`
8. 全量简介 `CATALOG-COPY.md` 分批
9. 26 款 `filePending` 入库
10. `charCount=1` 的目录脏数据（975 圆体等）从 vault 重导
11. 整站 `oss cp -r` 替代补丁（P0 脚本落地后执行一次全量）

## 验收

```bash
bash scripts/deploy-web-hz.sh --dry-run   # 列出将上传的路径
curl -sS https://app.windfonts.com/fonts | grep wf-proto.js
# 字体库第一屏不应再是 AAR/Thai 顶着「春风又绿江南岸」
# 点 AAR 预览应是拉丁句；点 975 黑体仍是中文句
```

## 不做

- 合 `fonts-front-v4-lab` / `v4-specimen`
- 匿名子集接口
- 把 16016 lab 树当成公网
