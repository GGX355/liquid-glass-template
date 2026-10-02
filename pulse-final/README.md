# PULSE 已确认视觉版 · 2026-10-03

用户指定的最终视觉基准：[实验室 PULSE](https://liquid-glass-lab.cyz200552032.chatgpt.site/pulse#pulse-stage)。

本目录完整保留该版布局、三套动态背景、可拖动透镜与形变、流动导航、倾斜卡片、展开胶囊、投票/抽签弹窗、玻璃预热和指针高光。全部 CSS 与 JavaScript 与 SOURCE.json 指向的原版逐字节相同，不混入 React 移植版的浅色控件样式。

- [独立体验站](https://pulse-glass.cyz200552032.chatgpt.site)
- index.html / pulse.html：PULSE 入口。
- lab.html：Liquid / 02 材质实验室。
- npm run dev：本地运行；npm test：原有 31 项测试。
- SOURCE.json：原版来源及文件哈希。HTML 仅调整实验室导航地址，样式、材质参数和动画未调整。

均衡设置沿用原版：透镜强度 50、活动面板 40、导航与小控件 22。这是项目参数，并非物理百分比。页面保留轻柔/均衡/鲜明选择。

独立示例体验，不连接真实账号或投票数据；刷新后重置。后续正式业务接入以本目录为视觉基准。
