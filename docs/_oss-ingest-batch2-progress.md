# OSS 第二批入库进度

生成：2026-09-23 晚。会话 `e8e864d5` → 续跑 `7634005f` → 本轮补 vault。

管线与首批相同：`fonts-packages`（`SUBSET_ONLY=full`）→ `cn.windfonts.com/fonts-packages/` → vault `feicode-prod` 容器 `fonts-vault` → `data/fonts.json`。

映射：`fonts-packages/scripts/oss-batch2-map.json`  
登记：`fonts-vault/scripts/register-oss-batch2.js`（`ONLY` + `CHAR_JSON`）  
字符统计：`fonts-packages/logs/chars-batch2-recheck.json`

## 已上目录

| family | norm | CSS regular | 目录 |
|---|---|---|---|
| wenfeng-hcpixels | Hcpixels | 200 | 已写入 `data/fonts.json` |
| wenfeng-hcline | Hcline | 200 | 已写入 |
| wenfeng-sykd | Sykd | 200 | 已写入 |

备份：`/www/wwwroot/fonts-vault/data/prod.db.bak-20260923-preBatch2`。

像素体、线体无汉字，语言不是简体。思源等宽是简体分面 OTF。

## 同一晚又上了八款

`/api/css` regular 均为 200。品牌：但、昭源、璇玑造字。

| family | norm | 来源 |
|---|---|---|
| wenfeng-ysui | Ysui | ButTaiwan/iansui |
| wenfeng-yqyt | Yqyt | GenSenRounded2TW 静态 OTF |
| wenfeng-yymt | Yymt | GenYoMin2TW 静态 OTF |
| wenfeng-yyht | Yyht | GenYoGothic2TW 静态 OTF |
| wenfeng-zyst | Zyst | Chiron Sung HK 静态 OTF |
| wenfeng-zyht | Zyht | Chiron Hei HK 静态 OTF |
| wenfeng-zyyt | Zyyt | Chiron GoRound TC 静态 OTF |
| wenfeng-zqfs | Zqfs | 朱雀仿宋 v0.212 |

## 没做完

遍黑体：静态 zip 里完整字是 TTC，P1/P2 不是字重。更纱：TTC 或约 850MB TTF。源起（GenKi）没拿。未 git commit。
