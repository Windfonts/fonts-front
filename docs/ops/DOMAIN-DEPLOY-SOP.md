# Windfonts 域名与部署 SOP

> 操作手册。架构口径以 [DOMAIN-ARCHITECTURE.md](../DOMAIN-ARCHITECTURE.md) 为准。  
> 定稿：2026-09-25。改域名职责前先改 DOMAIN，再改本文。

## 1. 主机一览（现网）

| 主机 | 挂什么 | 机器 / 上游 | 证书 |
|---|---|---|---|
| `app.windfonts.com` | fonts-front **静态**（feicode `/www/wwwroot/fonts-front`）；`/api` `/admin` `/_next` 过渡反代 Next；**公网 DNS → CyberCDN 十边**（§5.1） | 源 `45.117.8.70`；解析见十边 | 通配 / CDN `windfonts` |
| `vault.windfonts.com` | fonts-vault（Docker `fonts-vault` → `127.0.0.1:4000`） | 同上 | `*.windfonts.com` |
| `api.windfonts.com` | **平台网关壳**：反代上游，`Host` 改写为 `vault.windfonts.com` | 同上 | 通配（目录 `cert/api.windfonts.com`） |
| `staging-app.` / `staging-vault.` | 预发静态 / 同机 Next | 同上 | 通配 |
| `cn` / `hk` / `en` / `jp.windfonts.com` | CyberCDN：字形走 OSS `wenfeng-fonts`；`/api/css` `/p/` 回源 **vault** | 十边（含 hk/sg/jp） | CDN 证 `windfonts`（`*.windfonts.com`） |
| `www.windfonts.com` | 301 → `https://windfonts.com/` | CyberCDN → WP | — |
| `windfonts.com` | WordPress | feicode + CDN | — |

**禁止：** 把 `api.` DNS/文档写成「等于 Next 容器」。网关可换上游；今天上游是 vault。

## 2. 发布前端（fonts-front → app）

### 2.1 现网正式路径（机上静态）

账号禁桶级 `public-read`（见 §5），**公网 `app` 以 feicode 磁盘为准**，不是浏览器直打 OSS。

**纪律（2026-09-28）：**

| 要做 | 不要做 |
|---|---|
| 用仓内 [`scripts/deploy-feicode-front.sh`](../../scripts/deploy-feicode-front.sh) 整站同步 | 只 scp `app/*` 或单文件「补丁推」当完整发布 |
| 先 `--staging`，手验首页 + 字体库 + 控制台后再 `--prod` | 本机 `127.0.0.1:16016` 当现网（那是 lab 工作区直出） |
| 改公开站（`css/` `js/wf-chrome.js` `index.html` 等）与改控制台一并推 | 假定「推了控制台，前台也会变」 |

推荐命令（本机在 `fonts-front-v4-lab` / `fonts-front` 仓根）：

```bash
./scripts/deploy-feicode-front.sh --staging   # → /www/wwwroot/fonts-front-staging
# 验收 staging-app 后：
./scripts/deploy-feicode-front.sh --prod      # → /www/wwwroot/fonts-front
# 或一次：
./scripts/deploy-feicode-front.sh --staging --prod
```

**传输：** 国内 Mac → `45.117.8.70:22` **直连**（脚本默认 `root@45.117.8.70` + `ProxyJump=none`）。  
`~/.ssh/config` 里 `feicode-prod` 若带 `ProxyJump weixiaoduo-prod`，整站包（百兆级）会慢一个数量级，**不要**当默认发布路径。仅境外或直连不通时：`WF_FEICODE_SSH=feicode-prod WF_SSH_NO_JUMP=0 ./scripts/deploy-feicode-front.sh --staging`。
脚本已排除：`lab.html`、`*-options.html`、`v5-*`、`docs/`、`scripts/`、`shots*` 等（与下表一致）。手搓 tar 时须同样排除，并优先走脚本以免漏文件。

手搓等价流程（脚本不可用时）：

```bash
TMP=/tmp/wf-front-sync.tgz
COPYFILE_DISABLE=1 tar czf "$TMP" \
  --exclude='.git' --exclude='.tmp-shots' --exclude='*.bak*' \
  --exclude='node_modules' --exclude='docs' --exclude='scripts' \
  --exclude='deploy' --exclude='.cursor' --exclude='refs' \
  --exclude='lab.html' --exclude='*-options.html' --exclude='v5-*.html' \
  --exclude='.lab' --exclude='shots*' \
  .

scp -o ProxyJump=none "$TMP" root@45.117.8.70:/tmp/wf-front-sync.tgz

ssh -o ProxyJump=none root@45.117.8.70 '
  set -euo pipefail
  SRC=/www/wwwroot/fonts-front-oss-sync
  PROD=/www/wwwroot/fonts-front
  STAGING=/www/wwwroot/fonts-front-staging
  rm -rf "$SRC" && mkdir -p "$SRC"
  tar --warning=no-unknown-keyword -xzf /tmp/wf-front-sync.tgz -C "$SRC"
  rsync -a --delete "$SRC"/ "$STAGING"/
  # 验收 staging-app 后：
  rsync -a --delete "$STAGING"/ "$PROD"/
'
```

验收（**公开站 + 控制台都要看**；只验 HTTP 码不够，还要比内容）：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://staging-app.windfonts.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://app.windfonts.com/
# 前台与本机是否同版（示例）
curl -sS https://app.windfonts.com/ | grep -oE 'wf-chrome\.js\?v=[^"]+' | head -1
curl -sS http://127.0.0.1:16016/ | grep -oE 'wf-chrome\.js\?v=[^"]+' | head -1
# 控制台
curl -sS https://app.windfonts.com/app/index.html | grep -oE 'wf-app\.js\?v=[^"]+' | head -1
# 源站磁盘（绕过 CDN 怀疑时）
ssh feicode-prod 'wc -c /www/wwwroot/fonts-front/js/wf-chrome.js /www/wwwroot/fonts-front/css/site.css'
```

Nginx rewrite 参考：`deploy/nginx-fonts-front.snippet.conf`。现网 conf：`/www/server/panel/vhost/nginx/app.windfonts.com.conf`。

### 2.2 OSS 预热（私有桶）

```bash
./scripts/deploy-oss-front.sh          # dry-run
./scripts/deploy-oss-front.sh --apply  # 上传到 wenfeng-web
```

桶 `wenfeng-web`（广州）与字体桶 `wenfeng-fonts` **分桶**。当前 ACL=`private`；账号策略拒绝 `PutBucketAcl public-read`。

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

## 5. OSS 公网与账号限制（诚实）

| 现象 | 含义 |
|---|---|
| `Put public bucket acl is not allowed` | 账号/组织策略禁止桶级 public-read |
| `wenfeng-web` ACL=`private` | 浏览器不能直打 OSS 网站 endpoint |
| 现网 `app` | **feicode 静态目录** 对外；OSS 作备份与将来 CDN 私有回源 |

**终态选项（需账号侧放行或走 CDN）：**

1. 控制台关掉 Block Public Access / 允许桶策略匿名 `GetObject`，再绑自定义域；或  
2. 阿里云 CDN / CyberCDN：`app` → 私有 OSS 回源（私有桶授权），DNS 切到 CDN。

在放行前 **不要** 把 `app` A 记录改成 OSS 网站 endpoint。

### 5.1 过渡：`app` 走 CyberCDN（源站仍 feicode）

OSS 公网未放行时的可行路径：边缘站点键 **`windfonts_app`** → 源 `45.117.8.70`，`Host: app.windfonts.com`。

| 项 | 值 |
|---|---|
| Ansible | `roles/openresty-edge-cache/defaults/main.yml` → `sites.windfonts_app` |
| 边缘 conf | `/usr/local/openresty/nginx/conf/conf.d/windfonts_app-edge.conf` |
| `/api/` `/admin` | **不缓存** passthrough（登录 / NextAuth） |
| `/_next/` 与静态后缀 | 可缓存 |
| DNS | 与 `cn` 同十边 A 池；源站 IP 勿从解析里单独依赖（发布仍 scp→feicode） |

部署：

```bash
# devops
cd ~/Projects/ansible
ansible-playbook playbooks/deploy-openresty-edge-cache.yml --limit cdn_edge
```

切流前 `--resolve` 抽查（把 `<edge-ip>` 换成十边之一）：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  --resolve app.windfonts.com:443:<edge-ip> https://app.windfonts.com/
curl -sS -o /dev/null -w "%{http_code}\n" \
  --resolve app.windfonts.com:443:<edge-ip> https://app.windfonts.com/fonts/ibmps
curl -sS -o /dev/null -w "%{http_code}\n" \
  --resolve app.windfonts.com:443:<edge-ip> https://app.windfonts.com/api/auth/csrf
```

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
| 前端坏页 | `rsync` 上一份备份，或从 `oss://wenfeng-web` 拉回；nginx conf 有 `.bak-static-*` |
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
| `scripts/deploy-oss-front.sh` | 灌私有桶 |
| feicode nginx | `/www/server/panel/vhost/nginx/*windfonts*` |
| devops ansible | `openresty-edge-cache` defaults |
| cybercdn | N1/N1b 脚本 + defaults 备份 |

## 11. 未做（不要假装完成）

- WP 顾客 SSO ↔ vault hooks（**薇晓朵 OAuth 已通** `sso.weixiaoduo.com`；windfonts.com 统一账号 / API Key 绑定仍待）  
- 独立 Cloudflare zone 做 `hk`/`en`/`jp`（现网已用 **同一套 CyberCDN 十边** 验收 `/api/css`；CF 非阻塞）  
- `app` 真绑 **OSS 公网**（账号仍禁 public-read；过渡见 §5.1 CyberCDN）  
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

登录页：`https://app.windfonts.com/login.html`（管理员账号，非 WP 顾客号）。  
顾客统一账号仍待 windfonts.com ↔ vault hooks（§11）。

**本仓前台门禁（已做）：** `app`/`staging-app` 须 `source=vault-nextauth`；`?demo=1` 仅本机；设置页对未绑定会话的 API Key 给出同步 CTA，并标明顾客 WP SSO 未通。

## 13. 详情页 `/fonts/{slug}` 踩坑

nginx `rewrite … last` **不改浏览器地址**。若 HTML 里是相对 `js/…`，会请求 `/fonts/js/…` → 404，页面一直「正在加载字体…」。

**现网：** `font-detail.html` 使用 `<base href="/" />` 且资源写根路径 `/js/…`；`/fonts/` location 与 `.html` 加 `Cache-Control: no-store`。详情脚本从 pathname 解析 slug。



## 12. 429 限流复核（B9 · 2026-09-26）

vault `withFontApiAuth`（`src/lib/api/font-api-auth.ts`）：

| 场景 | 行为 |
|---|---|
| 白名单域 + `whitelist_rate_limit` | 按分钟配额，超限 **429** `rate_limited` |
| API Key 日配额 | 超日额度 **429** |
| 匿名 / 未验证站点 | 约 **100 次/天** 基础额度，超限 **429** |

边缘 CyberCDN：字形静态包与 `/api/css` 回源策略不在前台仓改；调参走 ansible `openresty-edge-cache`。本波确认现网开关仍生效，**未改阈值**。

## 13. 目录 JSON 纪律

- 公开 `data/fonts.json` / 分析元数据：**只**经 vault 导出或既定同步脚本写入。
- 禁止在 prod 磁盘上手改单条字体 JSON 顶替拆包流水线。
- 字重错挂（如思源）走重拆包工单，不在控制台「改名」了事。

## 14. admin / status 主机（P2）

- `admin.windfonts.com`：反代 vault `/admin` + IP 白名单；snippet 见 vault `deploy/nginx-admin.windfonts.com.snippet.conf`（**DNS 未挂前勿切**）。
- `status.windfonts.com`：应用静态 `status.html` 作过渡；正式应独立于 vault 同机。
