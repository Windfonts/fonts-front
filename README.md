# fonts-front

文风字库 **独立静态前台**（一期匿名 / Motuicons 打法）。

## 视觉真源

本仓由 Designer 从沙盒 HTML 原型种子迁入，气质对齐 next-windfonts（暗底、竖排分类、大字行、选字袋）。

**不是** fonts-vault 仓内继续磨前台。

## 一期范围

- 浏览 / 搜索 / 分类：构建时 JSON 随静态上 OSS；客户端搜
- 选字袋：`localStorage`
- 嵌入：只生成指向现网字体 API 的 CSS URL（API 仍 vault）

## 给 linuxjoy

1. 接构建：vault 元数据 → `data/*.json`
2. 本地静态预览
3. 预览域 OSS；`app.windfonts.com` 先不动

见 `/workspace/windfonts-research/ARCH-OSS-FRONT-WP.md`（WP 暂缓；一期匿名）。
