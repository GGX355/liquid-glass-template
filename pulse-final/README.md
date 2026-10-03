# PULSE 已确认视觉版 · 2026-10-03

用户指定的最终视觉基准：[实验室 PULSE](https://liquid-glass-lab.cyz200552032.chatgpt.site/pulse#pulse-stage)。

本目录是 PULSE 玻璃视觉的来源。实验室保留原展示布局与交互；PULSE embedded 工作页面仅保留全宽投票、抽签和管理区，移除宣传侧栏和互动展示区。三套动态背景、流动导航、弹簧、玻璃预热和指针高光沿用原引擎，外观控制折叠到页头。原版 React 功能页面跟随整页滚动，手机端不再限制为小型内部滚动卡片。

- [独立体验站](https://pulse-glass.cyz200552032.chatgpt.site)
- index.html / pulse.html：PULSE 入口。
- lab.html：Liquid / 02 材质实验室。
- npm run dev：本地运行；npm test：35 项光学、动画与业务边界测试。
- pulse-runtime.js：可挂载/销毁的原前端运行入口。
- pulse-business.js：旧独立实验控制器；PULSE 正式接入不使用此简化业务层。
- pulse-app.css / pulse-feature-layout.css：原功能页面的材质适配与隔离后的功能布局/揭晓动画；不会改变外部背景和光学参数。
- pulse-demo.js：公开站的内存示例适配器；不收集凭据，不写入真实活动。
- pulse-depth.css：此次授权的凸面边缘、阴影和白色加粗文字，以及新增业务表单样式。
- SOURCE.json：视觉基线提交与当前文件 SHA-256。新功能文件不再声称与旧版逐字节相同。

均衡设置沿用原版：透镜强度 50、活动面板 40、导航与小控件 22。这是项目参数，并非物理百分比。页面保留轻柔/均衡/鲜明选择。

独立公开站使用原版功能页面与示例数据库，刷新后重置，不支持多人共享示例活动。本地 PULSE dev 使用原有服务器函数，保留登录权限、截止时间、一人一票和原子抽签。这里不包含生产密钥。正式后端部署另行验证，原 vote.fflun.com 未改动。

Embedded 工作区使用统一米色背景，深色沿用原 PULSE 近黑底和蓝紫柔光。实验室的三套背景继续保留。按钮、选项、历史卡片统一凸面材质；React 更新选中状态后恢复已建立的玻璃表面，不重建滤镜。
