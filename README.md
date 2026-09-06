# Liquid Glass Template · 苹果液态玻璃 Web 模板

依照 **Apple HIG**（Typography / Materials）与 **WWDC25 Liquid Glass** 三层模型（highlight / shadow / illumination）实现的通用 Web 设计规范模板。纯 HTML + CSS + 原生 JS，零依赖，复制即用。

## 在线演示

**https://ggx355.github.io/liquid-glass-template/**

- index.html — 完整演示：盲选抽签场景，全局液态玻璃，默认 ②Smooth 动画，页面右上角循环主题
- basic.html — 最小组件示例

动画五档映射苹果 duration+bounce 弹簧模型（WWDC23）：① Snappy .35s/.45 ② Smooth .55s/0（无过冲，默认）③ Bouncy .6s/.65 ④ Liquid 方向性形变 ⑤ Island 面板 morph。URL 加 ?v=1~5 切换。

## 特性

- **真·液态玻璃材质**：中性无色玻璃（薄白膜 ~28-50%），颜色来自玻璃后的内容；`backdrop-filter: blur(10px) saturate(195%)`
- **棱边光效**：上缘高光 + 底部内收暗化 + **红蓝色散 fringe**（模拟真玻璃色差）+ 指针跟随镜面眩光
- **边缘透镜折射**：SVG `feDisplacementMap` 位移滤镜环
- **Aurora 流动背景**：5 个超大色块（blur 90px）慢速漂移 + 整层色相呼吸，即「液体流动感」的来源
- **颗粒层**：SVG feTurbulence 噪点，消除渐变色带
- **双主题**：跟随系统（实时监听 `prefers-color-scheme`）→ 黑夜 → 白天 三态循环，偏好持久化
- **阻尼弹簧**：JS 采样生成的弹簧关键帧（快起 + 衰减回弹），果冻挤压 / 内容入场 / 药丸滑动
- **Apple HIG 字阶**：34 / 22 / 17 / 15 / 13 / 12，间距 8pt 网格，圆角 12/20/28，触控目标 ≥ 44px
- **无障碍**：`prefers-reduced-motion` 下全部动画退化

## 使用

```html
<link rel="stylesheet" href="./liquid-glass.css"/>
<script type="module">
  import { initTheme, initGlare, jelly, stageIn } from "./liquid-glass.js";
  initTheme();   // 三态主题（按钮需带 .lg-theme-btn）
  initGlare();   // 镜面眩光跟随
</script>
```

任意元素加 `class="glass"` 即成玻璃框；背景层结构：

```html
<div class="orbs"><i class="o1"></i>…<i class="o5"></i></div>
<div class="grain"></div>
```

弹簧：`spring(el, ax, ay, { freq, decay, dur })`；果冻：`jelly(el)`；入场：`stageIn(el)`。

## 调规范

所有设计决策都是 CSS 变量，改一处全站生效：

| 令牌 | 含义 |
|---|---|
| `--fs-*` | HIG 字阶 |
| `--sp-*` / `--r-*` / `--touch` | 8pt 间距 / 圆角三档 / 触控目标 |
| `--glass-bg / --glass-bf / --rim` | 玻璃膜 / 模糊 / 棱边阴影 |
| `--o1..--o5` | Aurora 色块颜色 |

## 参考

- [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [CSS-Tricks: Getting Clarity on Apple's Liquid Glass](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/)
- [kube.io: Liquid Glass in the Browser（SVG 位移折射）](https://kube.io/blog/liquid-glass-css-svg)

## License

MIT
