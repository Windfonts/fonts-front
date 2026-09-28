# Fork 上游边缘缺口扫描（2026-09-27）

> 只读扫描。未改 `font-lineage.json` / `fonts.json` / CDN / vault。  
> 逻辑对齐：`matchNamedRecord`（最长 key 包含于 `font.name`）+ `WFChrome.findFontByName`（exact → `UPSTREAM_FONT` 别名 → 双向 `indexOf` 前缀）。

## 范围

| 项 | 数 |
|---|---|
| 目录字体 | 488 |
| 进入本扫描（relation=`fork`，或非 original 且 `upstreamName` 非空） | 216 |
| 其中 relation=`fork` | 191 |
| 其中 relation=`locale`（上游指向同胞/主款） | 25 |
| `UPSTREAM_FONT` 别名条数 | 35 |

## 汇总

| 类 | 含义 | 数量 |
|---|---|---|
| **A_ok** | `findFontByName(catalog, upstreamName)` 命中真实目录款 | **204** |
| **B_name_mismatch** | 上游在目录中有等价款，但 `upstreamName` 字面与目录 `name` 不一致，导致 find 失败（KH/yzdnn 同类） | **2** |
| **C_missing_upstream** | 上游名无法解析到任何目录款，且无可用 family/norm 映射 | **10** |
| **D_empty_upstream** | relation=`fork` 但 `upstreamName` 空，且 group 无可回填 face | **0** |
| **E（可选）** | 描述高置信派生，但无 lineage rec | **8**（精简后） |

**优先建议**：B 先做（只改名）→ C 中 OFL/自由父母清晰者入库 → D 无 → E 补 lineage。

**意外**：绝大多数 fork 边缘已通（204/216 ≈ 94%）。KH Dot / k6x8 / 袖珍像素体 今日已 ingest 后，原先 B 类 JP 名问题已消失。`docs/HANDOFF.md` 曾写落霞外源根占位（`IPAex Gothic` / `IPA 黑体` / `こころ明朝` / `03スマートフォントUI`）已进目录，**当前 `fonts.json` 中这四款均不存在**；`UPSTREAM_FONT` 仍指向它们 → 实质为 C，且别名目标悬空。

---

## A_ok（仅计）

204 款。含：

- 精确名命中（绝大多数思源/霞鹜/狮尾等 fork）
- 经 `UPSTREAM_FONT` 别名命中
- 经双向前缀命中（**脆弱** 4 条，建议顺手改成精确目录名，见下）

### 脆弱 A（find 靠前缀/别名，建议精确化）

| 目录名 | 当前 upstreamName | 实际命中 | 建议改成 |
|---|---|---|---|
| 简语生活体 | 辰宇落雁体 | 辰宇落雁体 Thin | `辰宇落雁体 Thin` |
| 猫啃网烟波宋 | 狮尾B2加糖 | 狮尾B2加糖宋体 | `狮尾B2加糖宋体` |
| 械黑 | IBM Plex Sans SC | IBM Plex Sans SC 简体中文 | `IBM Plex Sans SC 简体中文` |
| 文泉驿正黑等宽 | 文泉驿正黑体 | 文泉驿正黑 | `文泉驿正黑` |

另：`UPSTREAM_FONT['IBM Plex Sans SC']` → `IBM Plex 无衬线简体中文`，该目标**不在目录**；械黑仍靠原串前缀命中，别名本身是死链。

---

## B_name_mismatch（改名即可）

| 目录名 | family | norm | relation | upstreamName | group | 建议修复 |
|---|---|---|---|---|---|---|
| 文泉驿微米黑 | wenfeng-wqywmh | Wqywmh | fork | Droid Sans 后备体 | droid-sans | `upstreamName` → **`Droid Sans Fallback`**（目录已有；licenseNotes 亦写「后备体」） |
| 文泉驿微米黑等宽体 | wenfeng-wqydkwmh | Wqydkwmh | fork | Droid Sans 后备体 | droid-sans | 同上（byName 命中键为「文泉驿微米黑」） |

说明：`byName` 有 `Droid Sans`（original，无 family/norm），目录主名为英文 `Droid Sans Fallback`；中文「后备体」与英文名之间无 `UPSTREAM_FONT` 桥，故 find 失败。

---

## C_missing_upstream（候选入库）

| 目录名 | family | norm | relation | upstreamName | group | 缺失上游说明 |
|---|---|---|---|---|---|---|
| 寒蝉春秋·春风 | wenfeng-hccqcf | Hccqcf | fork | Slide Font / 幻灯片字体 | chill-chunqiu | **OFL 清晰**。Foundry `keynoteart` / `keynote` → https://github.com/maoken-fonts/slidefont 。优先 ingest。 |
| 寒蝉春秋·秋鸿 | wenfeng-hccqqh | Hccqqh | fork | Slide Font / 幻灯片字体 | chill-chunqiu | 同上。 |
| 霞鹜铭心宋 | wenfeng-xwmxs | Xwmxs | fork | こころ明朝 | kokoro-mincho | **OFL 系**。`UPSTREAM_FONT` 已有 こころ明朝体/Kokoro* → `こころ明朝`，但目录无此款。HANDOFF 称曾有 lineage-stub，现缺失。建议恢复占位或正式入库。 |
| 霞鹜尚智黑 | wenfeng-xwszh | Xwszh | fork | 03スマートフォントUI | smart-font-ui | 自由字体 UI 系；HANDOFF 曾列 stub，现缺失。需确认官方源后再 ingest。 |
| 霞鹜晰黑 CL | wenfeng-xwxhcl | Xwxhcl | fork | IPAex Gothic | ipa-gothic | **IPA Font License**。目录仅有 `IPAexMincho`；`UPSTREAM_FONT` 的 `IPAexGothic`→`IPAex Gothic` 悬空。建议 ingest / 恢复 stub。官方：https://moji.or.jp/ipafont/ |
| 霞鹜新晰黑 | wenfeng-xwxxh | Xwxxh | fork | IPA 黑体 | ipa-gothic | 同上族；别名 `IPA Gothic`/`IPA黑体`→`IPA 黑体` 悬空。可与 IPAex Gothic 一并处理（或映射到同一入库主名）。 |
| 华英明朝 | wenfeng-hymc | Hymc | fork | IPAmj明朝 | （无） | **IPA**。基于 IPAmj 明朝；官方 Mojikiban / IPA。候选 ingest。 |
| 宅在家粉条甜 | wenfeng-zzft | Zzft | fork | 天天宅在家 | （无） | 原作 starlove0425「完全免费」；FWHP 以 OFL 再发。父母未入库，三款同缺。 |
| 宅在家麦克笔 | wenfeng-zzmk | Zzmk | fork | 天天宅在家 | （无） | 同上。 |
| 宅在家自动笔 | wenfeng-zzzd | Zzzd | fork | 天天宅在家 | （无） | 同上。 |

### C 优先序（ingest）

1. **Slide Font / 幻灯片字体**（OFL，仓清晰，堵 2 fork）  
2. **こころ明朝** + **IPAex Gothic / IPA 黑体**（恢复 HANDOFF 占位或正式包；堵落霞链）  
3. **IPAmj明朝**（华英明朝）  
4. **03スマートフォントUI**（需再核官方）  
5. **天天宅在家**（免费原作；可仅占位 + 链到 FWHP 三款）

---

## D_empty_upstream

无。扫描范围内所有 `fork` 均有非空 `upstreamName`（或可由 group 继承；本批无「fork 且空且 group 无 face」）。

---

## E — 高置信派生但无 lineage rec（可选，精简）

仅保留「描述明确点名父母，且父母多已在目录」者：

| 目录名 | family | norm | 疑似父母（已在目录则注明） | 备注 |
|---|---|---|---|---|
| 点点像素宋体 | wenfeng-ddxstfx | Ddxstfx | 文泉驿点阵宋体 ✓ | 描述「衍生自文泉驿点阵宋体」；byName 有其它点点* 键但本款未挂 |
| 点点像素宋体钻石体 | wenfeng-ddxstlx | Ddxstlx | 文泉驿点阵宋体 ✓ | 同上 |
| 点点像素宋体圆 | wenfeng-ddxstyx | Ddxstyx | 文泉驿点阵宋体 ✓ | 同上 |
| 猫啃珠圆体 | wenfeng-mkzyt | Mkzyt | RocknRoll ✓ | 描述基于 Fontworks RocknRoll 补简中 |
| Kalo 黑体 | wenfeng-kalo | Kalo | 思源黑体 ✓ | 描述「基于思源黑体」 |
| 寒蝉高黑 | wenfeng-clg | Clg | 未来荧黑 ✓ | 描述基于未来荧黑与 Cabin |
| 萌神汉宋 | wenfeng-mspyt | Mspyt | 思源宋体 ✓ | 描述基于 Source Han Serif 插值 |
| 秋水书体 | wenfeng-qsst | Qsst | Klee One ✓（另 Ysabeau、霞鹜文楷） | 多父母；至少应挂 Klee One |

未列入：纯手写原创、父母不在库且证据弱、或「基于许可协议」误伤文案。

---

## 方法备忘

```
resolve: matchNamedRecord(byName, font.name)  // keys 按长度降序，indexOf 包含
upstreamName: rec.upstreamName
  || (relation==='original' ? '' : group.upstreamName)
  || ''

findFontByName(list, name):
  1) f.name === name
  2) UPSTREAM_FONT[name] 再 exact
  3) f.name.indexOf(name)===0 || name.indexOf(f.name)===0
```

分类规则：在 scope 内 → 无 up 则 D；find 命中则 A；否则若可提出目录内正确 `name`（本批：中英后备体）则 B；否则 C。

---

## 下一步（非本任务）

1. B：两行 `upstreamName` 改名（可 trivial 提交）。  
2. C：按优先序 ingest / 恢复 stub；同步修悬空 `UPSTREAM_FONT` 目标。  
3. 脆弱 A：四行精确化。  
4. E：为点点像素三款等补 `byName` fork → 文泉驿点阵宋体。  
5. 勿在本扫描任务中推 CDN / vault。
