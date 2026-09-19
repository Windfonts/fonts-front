# CHANGELOG · prototypes v3 → v3.1

**2026-09-19 (Asia/Shanghai)**

## 纠偏

| 版本 | 错在哪 | 结果 |
|------|--------|------|
| **v1** | 宣纸米色 `#FAF8F5` + 居中口号 + 小卡 | Feng：tasteless wireframe / mood board |
| **v2** | 把「旧产品」猜成 marketing / Google-Fonts 式 **卡片网格**（实为 fonts-vault 现网气质） | 仍不是 next-windfonts |
| **v3** | Feng 纠正真源 = feicode **`next-windfonts`** | 首页/列表/详情按 StaticLayout · FloatNavMenu · ClientScrollViewList · ItemFont · ActionArea 镜像 |
| **v3.1** | 结构已签；气质再磨 | 优雅 · 舒适 · 高雅 polish；**IA/布局模式不变** |

## v3 做了什么

1. **首页** — `home.webp` 全幅 + 暗罩；半透明顶栏白链；`icon.webp` + 购物袋；居中 `logo-bar.webp`；搜索；TAGS 竖排；深色页脚。  
2. **字体列表** — 高约 `11.25rem` 灰条 + 竖排 TAGS；sticky float；下划线预览输入 + SizeSlider；竖向行列表；角标购物袋。  
3. **详情** — `max-w-5xl`；面包屑；黑 CTA；ActionArea；tip `#F4F4F5`。  
4. **资源 / JS / 后台** — webfont CSS 链；共享样本；admin zinc chrome。

## v3.1 polish（elegant / comfort on next-windfonts bones）

1. **竖排 TAGS** — 改为旧源同款：每个标签拆成 **逐字 `<span>`** 纵向 flex 列（**不用** `writing-mode: vertical-rl`）；`gap` 当字距；条高 ~11.25rem；分隔 `rgba(0,0,0,0.14)`（列表）/ 白半透明（首页）；hover 轻、无下划线闪。  
2. **首页氛围** — 暗罩改软渐变（上略浅、下更深）；顶栏更玻璃、边更静；搜索加大 padding + 柔焦光晕；logo-bar 呼吸间距；页脚更安静。  
3. **字体行** — 行距 `mb` ~2rem；预览 `line-height: 1.35` + 轻 CJK `letter-spacing`、色 `#18181b`；meta 名 semibold 1.25rem / 作者·样式 zinc-500 0.75rem + 发丝竖线；「加入选择」仅 hover（opacity 0→1）、黑胶囊、绝对定位无跳动；默认字号 ~44；滑轨细黑；工具条下划线输入冷静。  
4. **详情舞台** — 预览台 py/px 宽松、边 `#e4e4e7`、min-height 更足；字重分段更紧、锌轨；meta 标题更静、间距更好；tip 保留 `#F4F4F5`、字号字重收紧。  
5. **动效** — 仅 180–220ms ease；无弹跳；行预览 `min-height` 防字号改时布局跳。

## 明确不是

- 不是 `www.windfonts.com` 营销站  
- 不是 fonts-vault 现网卡片栅格  
- 不是 v1 米色气质板  
- 不是另起 IA / card grid / beige moodboard
