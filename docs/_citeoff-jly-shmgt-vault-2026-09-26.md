# cite-off vault register — Jlyhmht / Shmgt · 2026-09-26

> **Consolidated 产品口径 + 证书链路审计：** [`CITE-CERT-GATE-2026-09-26.md`](./CITE-CERT-GATE-2026-09-26.md)  
> 本文件保留 vault / 取包 / 探活速查；细则以 consolidated + archive `VAULT-REGISTER` 为准。

**闸：** shelf + `citeAllowed=false`（tags `cite-closed`）。**禁止** `fonts-packages` CDN / Wave-1 可引用流。

## 官方包来源（无匿名完整直链）

| Norm | family | 官方页 | 获取步骤 |
|------|--------|--------|----------|
| **Jlyhmht** | `wenfeng-jlyhmht` | https://www.foundertype.com/index.php/FontInfo/index/id/12510 | 登录方正 → 字加/FounderClient 下 **细/常/粗** 完整包。Mac：`https://cdn13zk.foundertype.com/fclient/pro/mac/1.1.8/FounderClient_1.1.8.dmg`。**禁用** `cdn18…/ncss/GeelyDesignType-*` 试看子集。字加合集：https://www.zijia.com.cn/heji/418/ |
| **Shmgt** | `wenfeng-shmgt` | https://www.shanghaimodeng.com/#download | 填姓名/手机/邮箱 → `POST /api/generate-license` → `ShanghaiModeng-Licensed-Package.zip`。域名 **modeng**（非 modern）。 |

## 私有库存（register 真源）

`/Users/feibisi-studio/Projects/bot/archive/fonts-citeoff-2026-09/{Jlyhmht,Shmgt}/`

废弃：`_fonts_park/cite-closed-shmgt-jlyhmht-dl/`（DEPRECATED）。

## Vault 脚本（未齐包勿跑）

`fonts-vault/scripts/register-jly-shmgt.js`

- `oss_path: ''`；tags 含 `cite-closed`；brand 按 slug `founder` / `hantang` upsert
- 门闩：`CITEOFF_CONFIRM=1`；默认 dry inventory exit 2
- 跑：`docker exec -e CITEOFF_CONFIRM=1 fonts-vault node /app/register-jly-shmgt.js`
- 已跑结果：**559** 行；详见 archive `VAULT-REGISTER-2026-09-26.md`

## 探活（应持续 404）

- `https://cn.windfonts.com/fonts-packages/Jlyhmht/result.css`
- `https://cn.windfonts.com/fonts-packages/Shmgt/result.css`
- `https://cn.windfonts.com/api/css?family=wenfeng-jlyhmht|wenfeng-shmgt`

Front：`WFProto.citeAllowed` + `license-evidence` 禁托管/CDN → 详情「引用未开放」。  
站内预览：`data/preview-faces.json` + `assets/fonts/preview/*.woff2`（不改 citeAllowed）。

## 证书开引用

详情 CTA「上传证书 →」现链 `app/upload.html?cert=`，但该页是**自有字体上传**，**未**实现账号级 cite 解锁。缺口表见 [`CITE-CERT-GATE-2026-09-26.md`](./CITE-CERT-GATE-2026-09-26.md) §3。
