# fonts-front

文风字体（Windfonts）**前端原型 · v4**：公开站（首页 / 字体库 / 详情 / 厂商 / 特点 / 定价 / 文档 / 选字袋）+ 登录后控制台（项目 / 域名 / 我的字体 / 子集化 / 用量 / 上传 / 设置）。纯静态，无构建。

## 预览

```bash
python3 -m http.server 16016   # 仓根
# http://127.0.0.1:16016/            公开站
# http://127.0.0.1:16016/app/?demo=1 控制台（免登录演示）
# 任意页面加 ?theme=dark 看深色模式
```

样张字体从正式 CDN `cn.windfonts.com` 实时加载；UI 字体寒蝉全圆体随仓提供。

## 文档（先读再改）

| 文件 | 内容 |
|---|---|
| [docs/ai-context/project-structure.md](docs/ai-context/project-structure.md) | 技术栈、文件树、全局对象、关键约定 |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | 设计系统：决策记录、令牌、组件目录、图标、版式、文案、可访问性 |
| [docs/FRONTEND-STANDARDS.md](docs/FRONTEND-STANDARDS.md) | HTML / CSS / JS 规范、数据契约、CDN 口径、质量门禁、性能预算 |
| [docs/AI-NATIVE.md](docs/AI-NATIVE.md) | 智能体工作边界与流程、交付定义、多智能体协作、产品层 AI 能力基线 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 页面清单与状态、后端接口契约草案、待办与开放问题 |
| [styleguide.html](styleguide.html) | 设计系统活样张 |

## 数据

- `data/fonts.json` — 字体目录，由 `node scripts/export-fonts.mjs` 从 vault API 导出，不手改。
- `data/foundries.json` — 厂商字典（中文名 / 英文 / 简称 / 官网 / 别名），厂商名称唯一真源，手工维护。
- `data/mock-app.json` — 控制台演示数据。

## 历史

`CHANGELOG-v2.md` `CHANGELOG-v3*.md`；v4 变更见 `docs/HANDOFF.md §5`。
