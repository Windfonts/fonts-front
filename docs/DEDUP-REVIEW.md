# 字体去重审查（补：外站 Referer）

> **仍未删除。** 本页在累计 `api_call_count` 之外，用现网日志 **Referer** 区分外站 / 自站。

## 「引用」到底是什么

| 指标 | 含义 | 是否外站 |
|---|---|---|
| vault `api_call_count` | 历次 `GET /api/css` 累计（含本站样张 `ensureFontCss`、爬虫、空 Referer） | **不全是** |
| 本页 `ext` | 保留日志里 Referer 主机 **不是** `*.windfonts.com` / localhost | **是外站** |
| `self` | Referer 为本站 | 本站预览 |
| `empty` | Referer 为空或 `-`（应用内、部分客户端、偶发爬虫） | 不明 |

日志范围：feicode `windfonts-app.log` 及轮转（约 2.7 万行、1.1 万次 `/api/css`）。更早外站若只打 CDN 包路径，不会出现在 app 日志。

**结论：多数「同名重复」的累计 api 来自本站预览；外站几乎为 0 的那条，可以优先弃。**

## 外站引用（候选组）

| family | ext | self | empty | 累计 api | chars | 外站主机（若有） |
|---|---:|---:|---:|---:|---:|---|
| `wenfeng-syhtcjk` | **1472** | 1636 | 12 | 2496 | 44681 | summitsedu.com:260; zhxh233.fun:11; m.hong.life:6; 另有内网代理 172.30.11.118:1188 |
| `wenfeng-systcn` | **33** | 63 | 14 | 949 | 30847 | dujian.com / www.dujian.com |
| `wenfeng-systcnl` | **21** | 162 | 9 | 4045 | 30847 | liu-yi-xuan.com |
| `wenfeng-mysxt` | **1** | 64 | 13 | 1693 | 6890 | agentos-app.net（更像 Agent/爬虫，不像正式站） |
| 其余候选同名/版本条目 | **0** | * | * | * | * | 无 |

## 仔细核对后的处置建议

### A. 可直接弃（外站 0，且与保留条同名/同字数或明显劣）

弃 = 下架/隐藏 + **旧 family 301/别名到保留名**（日志里仍有旧名，不能裸删）。

| 组 | 保留 | 弃 | 依据 |
|---|---|---|---|
| 胡晓波骚包体 | `hxbsb` | `hxbsbt` | 双端 ext=0；chars 同 7414；累计 api 133 vs 125 |
| 汉字拼音体 | `hzpy` | `hzpyt` | ext=0；chars 同；api 275 vs 53 |
| 一点明体 | `kslyt` | `kslmt` | ext=0；chars 同；api 428 vs 99 |
| 沐瑶软笔手写体 | `mysxt` | `myrbsxt` | 弃条 ext=0；保留条仅 1 次可疑 Agent；api 1693 vs 172 |
| 千图纤墨体 | `qtxmt` | `qtqmt` | ext=0；chars 同；api 954 vs 19 |
| 酷黑 | `zkkht` | `huxiaobokuhei` | 弃条 ext=0 且 chars=0 |
| 屏显臻宋 | `pxzs` | `sypscn` | 弃条 ext=0 且 chars=0；保留 api 910 |
| 站酷快乐体 | `zkklt` | `happyzcool2016` | 双端近日志无外站；弃条 chars=0、累计 api=1（近日志 self 有预览） |
| 庞门粗书体 | `pmzdcst`（暂留） | `pmzdcst60` | 双端无外站、chars 皆 0、api≤2；6.0 先弃，母版是否空包另核 |
| 思源黑单包空字数 | `syhtcjk` | `syhtsc` `syhtcn` `syhttw` `syhtxt` | 弃条 chars=0、ext=0；**勿动** `syhtcjk`（外站量大） |
| 思源宋单包 | `systcn`+`systcnl` | `systsc` | `systsc` chars=0、ext=0；前两者有真实外站，**都留** |

### B. 已更正：不是重复（曾误按展示名聚类）

| 条目 | 结论 |
|---|---|
| `jxzk` | **江西拙楷体**（在用，保留） |
| `hyqzpt` | **另一套**：版权/短码指向 **黄胤淇招牌体**；曾被错标成江西拙楷 + 黄煜臣 → 已改回正确署名，**不去重、不弃** |
| `pmzdcsd` / `pmzdbtt` | **两套不同字体**（皆保留） |
| `cjkfqlt` vs `syhtcjk` | **无关**：前者 cjkFonts 手写扩展，后者 Noto/思源黑（在用）；曾因错误中文名「思源黑体 CJK」误聚 → 已改名，**不去重** |

### C. 明确不可弃

| family | 原因 |
|---|---|
| `wenfeng-syhtcjk` | 近日志外站 **1472**（教育站等） |
| `wenfeng-systcn` | 外站 dujian.com **33** |
| `wenfeng-systcnl` | 外站 liu-yi-xuan.com **21**（原 `wenfeng-light`） |

## 执行状态

1. **A 组同产品**：有字数的重复包仍 archived + 安全别名（骚包/拼音/一点明/沐瑶/纤墨等）。
2. **空壳清理**（2026-09-23）：库内无文件且 chars=0 全部 `archived`；前台 `fonts.json` 188→123；`opposansb`→`opsa`。
3. **错绑已撤**：`sypscn`/`sourcehanserifcnfordisplay`→`pxzs`，以及思源地区空壳→`syhtcjk`/`systcn` 别名已删除（空请求不再落到另一套真字体）。
4. **B 组**：非重复；`hyqzpt`/`cjkfqlt` 署名已纠正。
5. **署名二次核对修正**（2026-09-23）：`xlfht`→乡立方黑体；`zkxwt`→站酷小薇LOGO体；`lmqylszrht`→联盟起艺卢帅正锐黑体；`zkkht`→站酷酷黑；`lhls`→临海体；庞门标题两条用 3.12 / 6.0 区分展示名。
