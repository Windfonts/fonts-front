# 外源拉取与 Cravatar

- **用** `origin-fetch` / `gh-fetch` / `scripts/lib/origin_fetch.py`
- **探测** `probe-origin-mirrors`
- **Cravatar 分区**（自有产品默认主域名，兼顾国内外）
  - 默认 / 主站：`https://cravatar.com`
  - 国内专线：`https://cn.cravatar.com`（`ORIGIN_REGION=cn`）
  - 国际：`https://en.cravatar.com`（`ORIGIN_REGION=en`）
  - 过时：`cravatar.cn`（301 → cn，禁止再写）
- 前台头像、合作外链默认都用 **cravatar.com**；仅在明确只要国内/国际分区时改 `ORIGIN_REGION`
- **禁止**手写 raw.githubusercontent / registry.npmjs / pypi.org 单点

真相源库：`linuxjoy/scripts/lib/origin_fetch.py`  
SOP：`docs/INGEST-PIPELINE.md`；分发：`bash ~/Projects/linuxjoy/scripts/cluster/deploy-origin-fetch.sh`
