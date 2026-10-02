# PULSE 已确认视觉版 · 2026-10-03

用户指定的最终视觉基准：[实验室 PULSE](https://liquid-glass-lab.cyz200552032.chatgpt.site/pulse#pulse-stage)。

本目录是 PULSE 前端的唯一来源，保留该版布局、三套动态背景、可拖动透镜与形变、流动导航、倾斜卡片、展开胶囊、弹窗弹簧、玻璃预热和指针高光。2026-10-03 增加业务适配入口与全局凸面玻璃高光，不混入旧 React 组件或浅色控件样式。

- [独立体验站](https://pulse-glass.cyz200552032.chatgpt.site)
- index.html / pulse.html：PULSE 入口。
- lab.html：Liquid / 02 材质实验室。
- npm run dev：本地运行；npm test：35 项光学、动画与业务边界测试。
- pulse-runtime.js：可挂载/销毁的原前端运行入口。
- pulse-business.js：投票、抽签、创建、历史、登录和管理表单，样式与 DOM 都由本目录维护。
- pulse-demo.js：公开站的内存示例适配器；不收集凭据，不写入真实活动。
- pulse-depth.css：此次授权的凸面边缘、阴影和白色加粗文字，以及新增业务表单样式。
- SOURCE.json：视觉基线提交与当前文件 SHA-256。新功能文件不再声称与旧版逐字节相同。

均衡设置沿用原版：透镜强度 50、活动面板 40、导航与小控件 22。这是项目参数，并非物理百分比。页面保留轻柔/均衡/鲜明选择。

独立公开站使用示例数据，刷新后重置。本地 PULSE 工作分支通过适配器调用原有服务器函数，保留登录权限、截止时间、一人一票和原子抽签。这里不包含生产密钥或数据库。正式后端部署另行验证，原 vote.fflun.com 未改动。
