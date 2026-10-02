# PULSE 原应用液态玻璃 UI 预览

- 工作区：pulse-glass-preview；分支 codex/pulse-glass-preview；基线 origin/dev 3bc3a3f。
- 复用 LivePollView、OptionRow、DrawView 和 CreatePollForm。保留已有工作区修复，本轮未改服务端投票、认证、数据库逻辑。
- NativeShell 接管共享布局。材质、高光和导航动画来自实验室 v17，vendor/liquid-glass-v17/SOURCE.json 记录来源及哈希。
- 三套动态背景、亮暗主题、持久玻璃主卡片、弹性导航、原地淡出高光、说明弹窗及手机排版。
- npm run build:ui-preview 通过独立 Vite 配置构建共享 React 组件。仅此配置替换数据接口，示例保存在当前页面内存，刷新重置，不连接正式账号或投票。
- npm run build 仍使用原 TanStack Start / Nitro 构建和真实服务端接口，预览适配器不进入生产入口。
- 验证：单选计数及锁定；创建限选两项投票并提交；抽签翻牌；背景切换；390px 手机无横向溢出；手机弹窗边界、关闭及暗色主题。
- 类型检查、指定组件 ESLint、生产构建通过，业务数据层测试 79 项通过。
- 不合并 main/dev；示例预览不是多人投票生产服务。
