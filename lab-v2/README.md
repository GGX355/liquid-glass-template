# Liquid Glass Lab

独立原生 JavaScript 材质样板，基于 shuding/liquid-glass 展示的 Canvas → SVG → backdrop-filter 路线重新组件化。第二章增加极光、沙丘、蓝图背景、惯性透镜、三种透镜形状、弹性导航、倾斜卡片与展开胶囊。公开演示：https://liquid-glass-lab.cyz200552032.chatgpt.site 。核心组件仍为实验版本。

运行：`npm run dev`，打开 http://127.0.0.1:8092 。无依赖安装。`npm test` 检查位移数学边界、惯性帧率一致性、反弹与停顿。`npm run build` 将发布资源复制到 `dist`。发布以 `prepare-static.mjs` 中的白名单为准；旧的 `app.js`、`style.css`、`public/` 保留为第一章历史，不被当前入口加载或打包。

## 可复用接口

PULSE 的独立视觉体验位于 `pulse.html`（本地 http://127.0.0.1:8092/pulse.html），直接加载第二章的 `liquid-glass.js`、`optics.js`、`liquid-glass.css` 和 `visual.css`，全部玻璃表面固定强度 50。默认进入光感探索，可拖动回弹并切换圆角/圆形/胶囊；还提供弹性导航、倾斜邀请卡、可展开活动胶囊、三态主题、投票确认与灵感抽签。只使用示例内容，不连接真实 PULSE 数据。实现与验证范围见 [PULSE_PREVIEW.md](PULSE_PREVIEW.md)，与 GitHub 原版的比较见 [VERSION_COMPARISON.md](VERSION_COMPARISON.md)。

复制 `liquid-glass.js`、`optics.js`、`liquid-glass.css` 及 `THIRD-PARTY-LICENSE.txt` 至项目，加载 CSS：

```js
import { createLiquidGlass } from './liquid-glass.js';
const glass = createLiquidGlass(element, { strength: 45, radius: 40 });
// 接口会设置 CSS --radius；需有明确尺寸。
glass.setStrength(30);
glass.setRadius(90);
// 页面或组件卸载时：
glass.destroy();
```

React 中在 useEffect 内对 ref.current 初始化，返回 destroy；服务端不执行初始化。组件自身文字不参与背景滤镜。不要让宿主占用 ::before/::after；需时增加一个外层元素。

核心层仅负责材质和 ResizeObserver 清理。交互入口为 `experience.js`，惯性积分在 `motion.js`，页面样式为 `visual.css`。拖动不重生成位移贴图；每张贴图最多约 120,000 像素、最长边 600 像素；尺寸形变期间复用并拉伸已有贴图，静止 100ms 后再生成。修改圆角会重新生成曲面映射。强度调节只修改 SVG scale。

## 已知范围

真实 DOM 背景折射依赖浏览器支持 SVG backdrop-filter，优先在 Chromium 验证。CSS.supports 不能证明实际折射像素正确；Safari/Firefox 未实测，不承诺一致效果。磨砂与透明对照由 body 的 data-material=frost/plain 控制，可供降级；目前未自动检测实际滤镜渲染失败。

这不是完整物理光线追踪，没有实现真实色散或多界面光学。折射使用圆角曲面的有界位移近似，强调边缘和清晰中心。不要无节制铺满整页；接入前应对目标设备做性能测量。

系统减少动态效果开启时停用惯性、回弹、倾斜、过渡与背景动画；页面也提供暂停按钮。背景离开视口、页面隐藏时停止背景动画。按方向键可移动透镜；材质、背景、形状与展开控制均可用键盘操作。演示卡不访问任何投票服务、不产生业务记录。本目录独立于 pulse 和 pulse-validation，不更改其历史与文件。

## 设计参考

- [Apple, Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)：让折射、曲面高光与交互形变一起工作，保留内容层的清晰度，避免玻璃叠玻璃。
- [Microsoft Fluent Motion](https://fluent2.microsoft.design/motion)：自然惯性、有目的的状态变化和减少动态效果支持。
- [Microsoft Fluent Materials](https://fluent2.microsoft.design/material)：理解 Acrylic 磨砂和其他材质的不同用途，保留对照模式。
- [Shu Ding liquid-glass](https://github.com/shuding/liquid-glass)：Canvas 生成 SVG 位移图的方法；保留 MIT 声明。背景和版式使用本项目原生 CSS 绘制，没有拷贝品牌素材。

发布前的本轮浏览器检查记录存于本地忽略目录 `evidence/`。浏览器兼容、低端真机耗电与生产业务接入需在目标项目中单独验收。
