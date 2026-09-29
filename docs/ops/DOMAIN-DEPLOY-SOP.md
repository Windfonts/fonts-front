# Windfonts 域名与部署 SOP

> 操作手册。架构口径以 [DOMAIN-ARCHITECTURE.md](../DOMAIN-ARCHITECTURE.md) 为准。  
> 定稿：2026-09-25。2026-09-29 按现网改过源站 / 发版 / 干净 URL / 缓存。改域名职责前先改 DOMAIN，再改本文。

## 1. 主机一览（现网）

| 主机 | 挂什么 | 机器 / 上游 | 证书 |
|---|---|---|---|
| `app.windfonts.com` | fonts-front **静态 HTML/JS/CSS**；访客 origin = 杭州 OSS `wenfeng-web-hz`；CyberCDN zone `windfonts_app`。`/api` `/admin` `/_next` 仍回源 feicode vault。 | 静态：OSS hz；API：`45.117.8.70` | 通配 / CDN `windfonts` |
| `vault.windfonts.com` | fonts-vault（Docker `fonts-vault` → `127.0.0.1:4000`） | 同上 | `*.windfonts.com` |
| `api.windfonts.com` | **平台网关壳**：反代上游，`Host` 改写为 `vault.windfonts.com` | 同上 | 通配（目录 `cert/api.windfonts.com`） |
| `staging-app.` / `staging-vault.` | 预发静态 / 同机 Next | 同上 | 通配 |
| `cn` / `hk` / `en` / `jp.windfonts.com` | CyberCDN：字形走 OSS `wenfeng-fonts`；`/api/css` `/p/` 回源 **vault** | 十边（含 hk/sg/jp） | CDN 证 `windfonts`（`*.windfonts.com`） |
| `www.windfonts.com` | 301 → `https://windfonts.com/` | CyberCDN → WP | — |
| `windfonts.com` | WordPress | feicode + CDN | — |

**禁止：** 把 `api.` DNS/文档写成「等于 Next 容器」。网关可换上游；今天上游是 vault。

## 2. 发布前端（fonts-front → app）

**访客看到的 HTML/JS/CSS 只认杭州桶 `wenfeng-web-hz`。**  
feicode `/www/wwwroot/fonts-front` 是 API / 控制台反代机上的副本，**不是**公网静态 origin。只 rsync 磁盘、不写桶 = 公网不变。

仓：`fonts-front` **main**。`127.0.0.1:16016` 是 lab 树 `fonts-front-v4-lab`（相对路径、`fonts.json`），**不要**拿它的戳对公网。

### 2.1 公网静态（必须）

| 要做 | 不要做 |
|---|---|
| 从 **main** 整站灌 `oss://wenfeng-web-hz`（devops `aliyun oss --profile wenpai --region cn-hangzhou`） | 灌广州 `wenfeng-web`；用 Mac ossutil / feicode acme / `fonts-packages/.env` |
| HTML 资源写根路径 `/css/` `/js/` | 把 lab 相对路径 `css/` `js/` 推上公网（`/fonts/{slug}` 下会请求 `/fonts/js/` → 卡在「正在加载字体…」） |
| `WFChrome.href` 在 `app.windfonts.com` 走 `livePagePath`（无 `.html`） | 只改边缘 rewrite、顶栏仍输出 `fonts.html`；或把 `href()` 写成 `ROOT + path` 当已接线 |
| 改完 bump `?v=`，HTML 与 JS/CSS 一起上 | 半仓旧戳（chrome 新、docs 仍 g1） |
| 验收看 **OSS etag + 浏览器 HTML 戳 + JS 字节** | 只 curl 200；只对 16016 |

```bash
# 在 devops 上，文件已在机上
aliyun oss --profile wenpai cp <file> oss://wenfeng-web-hz/<key> \
  --region cn-hangzhou --force
```

`scripts/deploy-oss-front.sh` 默认仍写广州桶，**不能**当公网发版。单文件 `cp` 只适用于已对过清单的补丁；换壳 / 换 chrome / 换 CSS 必须把所有引用该戳的 HTML 一起上。

### 2.2 边缘缓存（zone `windfonts_app`）

| 资源 | cache key | 有效期 |
|------|-----------|--------|
| JS / CSS | `"$scheme$host$uri$args:g1"` | 长 |
| HTML | `"$scheme$host$uri$args"`（**浏览器路径**，含 `/foundry/zcool`） | 约 1m |

清 JS 必须带 `?v=` 和 `:g1`。`/foundry/zcool` 与 `/foundry.html` 不是同一份 HTML 缓存。`cybercdn-url-purge.py` 尚未登记 `app.windfonts.com`。

现网 rewrite（ansible `openresty-edge-cache` `windfonts_app.locations`，**不带** `?slug=`）：

- `/fonts/{slug}` → `rewrite ^ /font-detail.html last`（slug 由 `detail.js` 读 pathname）
- `/foundry/{slug}` → `rewrite ^ /foundry.html last`（**不要**回 vault）
- `/fonts` `/foundry` `/docs` `/about` `/features` `/lineage` → `$uri.html`

### 2.3 feicode 磁盘（可选，不是访客 origin）

`/api` `/admin` `/_next` 仍在 `45.117.8.70`。要更新那台机上的静态副本，用 `scripts/deploy-feicode-front.sh --staging` 再 `--prod`。国内 Mac 直连 `root@45.117.8.70`（`ProxyJump=none`）。这 **不会** 更新公网 HTML。

不要把 `127.0.0.1:16016` 当现网。

### 2.4 店面预览包

列表 / 首页短样张走 `fonts-packages/{Norm}/{Weight}/preview-shop/`（字体桶 `wenfeng-fonts`，不是网页桶）。现网 shop 包大约 41 个汉字（「上中体到动南又在地处天文日时月水江派流看行起里间风」一类），**盖不住**「春风又绿江南岸」的春/绿/岸，也盖不住首页「让中文字体，在网页上流动」的让/字/网页。

规则：

- `ensureFontCss(family, weight, 'preview-shop', text)` 按注入 CSS 的 `unicode-range` 检查 `text`；盖不住就升级 `zh`，再不行 `full`。
- `WFProto.setSample` **必须**按新字再跑（输入框、预设按钮、粘贴）。禁止只改 `[data-specimen]` 的 `textContent`。
- 禁止公开 `GET /api/css?text=`。
- 下滑加载的新行用**当前**样张去拉包，不要用页面刚打开时的默认句。
- 字库本身没有汉字（AAR / Thai / Viet 等）：即使用户输入中文，补 `zh`/`full` 也变不出这款字的中文，会走系统黑体。这是字库覆盖，不是包坏了。

### 2.5 发版步骤（公网口径，按这个做）

仓：`~/Projects/fonts-front` **main**。不要从 `fonts-front-v4-lab` 灌公网。

1. 改 `js/` `css/` 后，**所有引用该文件的 HTML** 同步 bump `?v=`。只换 JS 不换 HTML 戳 = 边缘继续 HIT 旧 JS。
2. `git push origin main`。
3. 文件拷到 **devops**，用 `aliyun oss --profile wenpai --region cn-hangzhou` 写入 `oss://wenfeng-web-hz/<key> --force`。Mac ossutil / 广州桶 / feicode 磁盘 rsync **都不算**发版。
4. 验收（不够 200）：

```bash
# 戳必须与刚推的 main HTML 一致
curl -sS https://app.windfonts.com/ | grep -oE 'wf-(proto|chrome)\.js\?v=[^"]+'
curl -sS https://app.windfonts.com/fonts | grep -oE 'wf-proto\.js\?v=[^"]+'
# rewrite 页不能出现相对 js/
curl -sS https://app.windfonts.com/fonts/ibmps | grep -E 'src="/js/|href="/css/' | head
# 顶栏脚本是 ui3+（href → livePagePath）
```

5. HTML 按**浏览器路径**缓存约 1m。`/foundry/zcool` 可能仍 HIT 旧壳；等 TTL 或删边缘 `/var/cache/openresty/windfonts_app/` 对应 key。
6. 换 chrome / proto / 预览逻辑后，用浏览器走一遍 §2.6，不要只 curl。

lab 仓里的 `scripts/deploy-oss-front.sh` 默认广州 `wenfeng-web`，**禁止**当公网发版。单文件 `cp` 只给已经对过「谁引用了这个戳」的补丁。

### 2.6 用户路径（发版后必点）

| 谁在干什么 | 期望 | 常见翻车 |
|------------|------|----------|
| 打开首页 | 大标题是这款字的面；「浏览字体库」→ `/fonts` | shop 包缺「让/字/网页」，没传 hero 文本去升级就会混系统字体 |
| 点「换一款」 | 新款重新 `preview-shop` → 按标题文字升级 | 只换了 DOM family，CSS 还停在上一款 |
| 进字体库 | 默认短句尽快变成该款面；骨架行被样张替换 | 只铺了 shop，春/绿/岸一直系统黑体 |
| **自己在预览框打字 / 粘贴** | 140ms 后按新字补 `zh`/`full`，可见行一起变 | 只改了字，包还是 41 字那份 |
| 点预设（短句/标题/段落/品牌/诗句/中英数） | 与打字同一条 `setSample` | 预设走了另一条只改 text 的路径 |
| 下滑加载更多 | 新行用**当前输入**拉包 | IntersectionObserver 捕获的是进页时的默认句 |
| 无汉字的卡（AAR/Thai/Viet）打中文 | 系统黑体，不要当成这款字 | 看起来「很多预览缺字」 |
| 打开 `/fonts/{slug}`、`/foundry/{slug}` | 详情/厂商壳，不是加载空一句；资源 `/js/` | 相对路径 → `/fonts/js/` 404，卡在「正在加载字体…」 |
| 书签仍是 `fonts.html` | 边缘 200，顶栏仍输出干净 URL | 只验了干净 URL，旧链 404 |
| 详情「获取代码」 | toast + 开发视图；嵌入地址是 `cn/hk/en.windfonts.com/api/css`，无 `text=` | 误加匿名子集 |
| 目录失败 / 找不到 | `.page-state` 占住版心，有回字体库 | 一句灰字贴在超宽白底 |

## 3. 发布 / 启停 vault（Next）

容器名：`fonts-vault`，映射 `127.0.0.1:4000`。

```bash
ssh … root@45.117.8.70 '
  docker ps --filter name=fonts-vault
  docker restart fonts-vault   # 常规
'
```

健康检查：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://vault.windfonts.com/api/fonts?page=1&size=1"
```

运营后台：`https://vault.windfonts.com/admin`（过渡期 `app…/admin` 仍反代同一上游）。

## 4. 平台网关 `api.`

- DNS：`api` A → `45.117.8.70`（Aliyun DNS / hichina）
- Nginx：`/www/server/panel/vhost/nginx/api.windfonts.com.conf`  
  片段入库：`deploy/nginx-api-gateway.snippet.conf`
- 行为：`proxy_set_header Host vault.windfonts.com`；响应头 `X-Windfonts-Gateway: api`
- 自检：`GET /gateway/health` → JSON，**不依赖** Next 进程语义（vault 挂时仍可为 200）

换上游：只改 conf 里 `upstream windfonts_api_upstream`（或 Host），**不要**改前端常量以外的硬编码「api=某容器 IP」。

## 5. OSS 与 CyberCDN（现网）

桶都是 private。浏览器不直打 OSS 网站 endpoint。访客走 CyberCDN：

| 桶 | 区域 | 用途 |
|----|------|------|
| **`wenfeng-web-hz`** | 杭州 | **`app.windfonts.com` 静态 origin** |
| `wenfeng-web` | 广州 | 09-28 预热残留，**不是**访客那份 |
| `wenfeng-fonts` | 广州 | 字形 `fonts-packages/` → `cn.windfonts.com` |

写网页桶：devops `aliyun --profile wenpai`。feibisi/modiqi profile、Mac ossutil、字体 RAM key 对网页桶 403。

`Put public bucket acl is not allowed` = 不要开桶级 public-read。现网已经是 CDN 回源私有桶，**不要**再把 `app` A 记录改成 OSS 网站 endpoint。

### 5.1 边缘 `windfonts_app`

| 项 | 值 |
|---|---|
| Ansible | `roles/openresty-edge-cache/defaults/main.yml` → `sites.windfonts_app` |
| 边缘 conf | `/usr/local/openresty/nginx/conf/conf.d/windfonts_app-edge.conf` |
| 静态 origin | OSS `wenfeng-web-hz`（杭州） |
| `/api/` `/admin` | **不缓存**，回源 feicode vault |
| nginx 二进制 | `/usr/local/openresty/nginx/sbin/nginx`（不在 PATH） |

部署：

```bash
cd ~/Projects/ansible
ansible-playbook playbooks/deploy-openresty-edge-cache.yml --limit cdn_edge
```

抽查（`<edge-ip>` 换成十边之一）：

```bash
curl -sS -D - -o /tmp/app.html --resolve app.windfonts.com:443:<edge-ip> \
  https://app.windfonts.com/ | grep -E 'etag|x-oss-|wf-chrome.js\?v='
curl -sS -o /dev/null -w "%{http_code}\n" --resolve app.windfonts.com:443:<edge-ip> \
  https://app.windfonts.com/fonts/ibmps
```

HTML 里必须是 `/js/` `/css/`，且 `wf-chrome.js?v=` 与 main 一致。打开 `/fonts/ibmps` 不能请求 `/fonts/js/`。

## 6. CDN（cn|hk|en|jp）回源 vault

- 现网：十边 `/api/css`、`/p/` 的 `origin_host` = `vault.windfonts.com`
- Ansible 真相源（devops）：`roles/openresty-edge-cache/defaults/main.yml` 键 `windfonts` + upstream `windfonts_vault`
- 仓备份：`cybercdn` 同角色 defaults + 脚本 `ansible/scripts/n1b-windfonts-origin-host-vault.py`
- **`hk` / `en` / `jp`**：与 `cn` **同一套 CyberCDN 十边**（非独立 Cloudflare zone；证书已含 `*.windfonts.com`）。DNS A 池与 `cn` 对齐。

抽查：

```bash
FAM='wenfeng-ibmps&weight=regular&subset=zh-common'
for h in cn hk en jp; do
  curl -sS -o /dev/null -w "$h=%{http_code} " \
    "https://$h.windfonts.com/api/css?family=$FAM&_=$(date +%s)"
done
echo
```

**对外 URL 形态禁止改成 app/vault/api。**

## 7. 故障隔离演练（必做清单项）

目的：证明 vault 挂 ≠ 整站废。

```bash
docker stop fonts-vault
# 期望：windfonts.com / app → 200；/gateway/health → 200
#       vault /api/fonts、api /api/fonts、cn /api/css（未命中缓存）→ 502
docker start fonts-vault
# 等到 vault /api/fonts 恢复 200
```

**2026-09-25 实测（`/tmp/vault-drill-20260925122354.log`）：**  
停容器期间 WP/app=200，vault/api/cn=502，health=200；约 4s 内恢复。

## 8. 回滚速查

| 场景 | 动作 |
|---|---|
| 前端坏页 | 把上一版 main 的对象再 `cp` 进 `oss://wenfeng-web-hz`（不要拉广州 `wenfeng-web`）；HTML 路径缓存约 1m |
| vault 坏版本 | `docker` 回滚上一镜像 tag 并 recreate |
| CDN Host 误改回 app | 按 §6 再改 vault 并 reload；清相关 CSS 缓存键 |
| api 网关误配 | 恢复 `api.windfonts.com.conf`；前端仍可直连 vault |
| 误停 vault | `docker start fonts-vault` |

## 9. 日常探针（复制即用）

```bash
curl -sS -o /dev/null -w "wp=%{http_code} " https://windfonts.com/
curl -sS -o /dev/null -w "app=%{http_code} " https://app.windfonts.com/
curl -sS -o /dev/null -w "fonts=%{http_code} " https://app.windfonts.com/fonts/ibmps
curl -sS -o /dev/null -w "vault=%{http_code} " "https://vault.windfonts.com/api/fonts?page=1&size=1"
curl -sS -o /dev/null -w "api=%{http_code} " "https://api.windfonts.com/api/fonts?page=1&size=1"
curl -sS -o /dev/null -w "health=%{http_code} " https://api.windfonts.com/gateway/health
curl -sS -o /dev/null -w "cn=%{http_code} " \
  "https://cn.windfonts.com/api/css?family=wenfeng-ibmps&weight=regular&version=full&_=$(date +%s)"
curl -sS -o /dev/null -w "hk=%{http_code} " \
  "https://hk.windfonts.com/api/css?family=wenfeng-ibmps&weight=regular&subset=zh-common&_=$(date +%s)"
curl -sS -o /dev/null -w "en=%{http_code} " \
  "https://en.windfonts.com/api/css?family=wenfeng-ibmps&weight=regular&subset=zh-common&_=$(date +%s)"
curl -sS -o /dev/null -w "jp=%{http_code} " \
  "https://jp.windfonts.com/api/css?family=wenfeng-ibmps&weight=regular&subset=zh-common&_=$(date +%s)"
curl -sS -o /dev/null -w "stg=%{http_code}\n" https://staging-app.windfonts.com/
```

## 10. 相关路径

| 路径 | 说明 |
|---|---|
| `docs/DOMAIN-ARCHITECTURE.md` | 域名职责与验收 |
| `deploy/nginx-fonts-front.snippet.conf` | app 静态 rewrite |
| `deploy/nginx-api-gateway.snippet.conf` | api 网关壳 |
| lab `scripts/deploy-oss-front.sh` | 默认广州桶，禁止当公网发版 |
| feicode nginx | `/www/server/panel/vhost/nginx/*windfonts*` |
| devops ansible | `openresty-edge-cache` defaults |
| cybercdn | N1/N1b 脚本 + defaults 备份 |

## 11. 未做（不要假装完成）

- WP 顾客 SSO ↔ vault hooks（**薇晓朵 OAuth 已通** `sso.weixiaoduo.com`；windfonts.com 统一账号 / API Key 绑定仍待）  
- 独立 Cloudflare zone 做 `hk`/`en`/`jp`（现网已用 **同一套 CyberCDN 十边** 验收 `/api/css`；CF 非阻塞）  
- 桶级 public-read 仍禁（不需要：现网已是 CDN→私有 `wenfeng-web-hz`）  
- 预发独立 Next 进程（现 `staging-vault` 与生产同容器）

## 12. 控制台登录（NextAuth / WFAuth）

| 项 | 现网 |
|---|---|
| 会话 | vault NextAuth Credentials（管理员账号）；cookie 挂在 **`app.windfonts.com`**（`NEXTAUTH_URL`） |
| 前端 | `js/wf-auth.js` → 同域 `/api/auth/*`（app nginx 反代 `:4000`） |
| 门禁 | `app` / `staging-app` **必须** vault 会话（`source=vault-nextauth`）；清掉纯 localStorage 假壳 |
| demo | `?demo=1` 仅本机 / `ALLOW_DEMO`；生产禁 |
| WFApi | 生产默认 **live**；项目/域名/子集加字 → vault `/api/projects`；用量 `/api/usage*` 聚合 `api_usage_daily`；选字袋 `/api/picks`；认领 `/api/claims` + 管理员审核 `/api/admin/claims`（覆盖层 `GET /api/foundries/claim-status`；可选 `FOUNDRIES_JSON_PATH` 回写） |
| 预发 | `staging-app` 已反代 `/api` `/admin` `/_next`，可联调登录 |

探针：

```bash
curl -sS https://app.windfonts.com/api/auth/csrf
curl -sS https://app.windfonts.com/api/auth/providers
curl -sS https://staging-app.windfonts.com/api/auth/csrf
```

登录页：`https://app.windfonts.com/login`（管理员账号，非 WP 顾客号；`login.html` 仍 200）。  
顾客统一账号仍待 windfonts.com ↔ vault hooks（§11）。

**本仓前台门禁（已做）：** `app`/`staging-app` 须 `source=vault-nextauth`；`?demo=1` 仅本机；设置页对未绑定会话的 API Key 给出同步 CTA，并标明顾客 WP SSO 未通。

## 13. 详情页 `/fonts/{slug}` / `/foundry/{slug}`

nginx `rewrite … last` **不改浏览器地址**。现网是 `rewrite ^ /font-detail.html last`（**没有** `?slug=`）。slug 由 `js/pages/detail.js` / `foundry.js` 读 pathname。

公网 HTML **必须**根路径 `/js/` `/css/`（可加 `<base href="/" />`）。相对 `js/` 会请求 `/fonts/js/`，页面卡在加载空态。

`WFChrome.href` 在 `app.windfonts.com` 必须走 `WFProto.livePagePath`，生产链接不带 `.html`。本机 python http.server 无 rewrite，仍用 `.html`。

HTML 缓存按**浏览器 URI**（`/foundry/zcool` ≠ `/foundry.html`）。发版后要等 TTL 或按 key 删 `/var/cache/openresty/windfonts_app/`。



## 15. 429 限流复核（B9 · 2026-09-26）

vault `withFontApiAuth`（`src/lib/api/font-api-auth.ts`）：

| 场景 | 行为 |
|---|---|
| 白名单域 + `whitelist_rate_limit` | 按分钟配额，超限 **429** `rate_limited` |
| API Key 日配额 | 超日额度 **429** |
| 匿名 / 未验证站点 | 约 **100 次/天** 基础额度，超限 **429** |

边缘 CyberCDN：字形静态包与 `/api/css` 回源策略不在前台仓改；调参走 ansible `openresty-edge-cache`。本波确认现网开关仍生效，**未改阈值**。

## 16. 目录 JSON 纪律

- 公开 `data/fonts.json` / 分析元数据：**只**经 vault 导出或既定同步脚本写入。
- 禁止在 prod 磁盘上手改单条字体 JSON 顶替拆包流水线。
- 字重错挂（如思源）走重拆包工单，不在控制台「改名」了事。

## 17. admin / status 主机（P2）

- `admin.windfonts.com`：反代 vault `/admin` + IP 白名单；snippet 见 vault `deploy/nginx-admin.windfonts.com.snippet.conf`（**DNS 未挂前勿切**）。
- `status.windfonts.com`：应用静态 `status.html` 作过渡；正式应独立于 vault 同机。
