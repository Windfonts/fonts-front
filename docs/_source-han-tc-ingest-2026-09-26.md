# 思源黑体 TC 七字重入库（2026-09-26）

说人话：繁体主推改成 **TC 语言版七字重**（`Syhttc`），不再拿 TW 地区子集空壳顶着用。

## 做了啥

1. 从 Adobe `2.005R` 拉了 `10_SourceHanSansTC.zip`（语言特定，不是 `20_…TW` 子集）。
2. 切包上传 CDN：`fonts-packages/Syhttc/{ExtraLight,Light,Normal,Regular,Medium,Bold,Heavy}/full/`。
3. 目录加了 `wenfeng-syhttc`；产品卡 `adobe-source-han-sans` 芯片 SC + **TC**（primary），CN 仍 secondary。
4. **TW 壳 `wenfeng-syhttw`：从产品卡下架**（目录还留着，旧 CDN 路径别踩雷；已知 Regular 路径其实是 Bold）。
5. 简繁配对：`syhtsc ↔ syhttc`；`byFamily` 优先产品/显式对，避免后缀启发式又把 TW 盖回去。
6. analysis 元数据按 lab 目录重建并上传（450/456），前台 `?v=20260926syhttc2`。

## 抽查

- `https://cn.windfonts.com/fonts-packages/Syhttc/Regular/full/result.css` → Source Han Sans **TC** Regular
- `…/Normal/…` → TypographicSubfamilyName **Normal**（350）
- 详情：`http://127.0.0.1:16016/font-detail.html?slug=syhttc`

## 源件停车

- 原始 OTF：`_fonts_park/Syhttc/`（含 LICENSE.txt）
- zip：`_fonts_park/oss-syhttc-dl/10_SourceHanSansTC.zip`
