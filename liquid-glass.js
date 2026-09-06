/* ═══════════════════════════════════════════════════════════════
   Liquid Glass Template · 交互脚本（无依赖，ES Module 可选）
   提供：三态主题（跟随系统）、阻尼弹簧、镜面眩光跟随、导航药丸
   ═══════════════════════════════════════════════════════════════ */

/* ── 阻尼弹簧：生成 linear 关键帧模拟真实弹簧（快起 + 衰减回弹） ──
   ax/ay：两轴振幅（一正一负 = 保体积的果冻挤压）
   freq：Hz；decay：衰减系数；dur：毫秒 */
export function springKF(ax, ay, { freq = 3.2, decay = 5.2, dur = 950, phase = 0 } = {}) {
  const N = 40, kf = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const env = Math.exp(-decay * t);
    const w = Math.cos(phase + freq * Math.PI * 2 * t);
    kf.push({ transform: `scale(${(1 + ax * env * w).toFixed(4)}, ${(1 + ay * env * w).toFixed(4)})`, offset: t });
  }
  return kf;
}
export function spring(el, ax, ay, opt) {
  return el.animate(springKF(ax, ay, opt), { duration: (opt && opt.dur) || 950, easing: "linear" });
}
/* 果冻挤压：面板/卡片切换内容时的「灵动」手感 */
export function jelly(el) { return spring(el, 0.045, -0.045, { freq: 3.1, decay: 5, dur: 950 }); }

/* 内容入场：模糊淡入 + 轻微过冲 */
export function stageIn(el) {
  return el.animate([
    { opacity: 0, transform: "scale(.94,.9)", filter: "blur(9px)" },
    { opacity: 1, transform: "scale(1.025,.975)", filter: "blur(0px)", offset: .42 },
    { transform: "scale(.992,1.006)", offset: .74 },
    { opacity: 1, transform: "scale(1,1)" },
  ], { duration: 640, easing: "cubic-bezier(.24,.9,.32,1)" });
}

/* ── 三态主题：跟随系统（默认）→ 暗色 → 亮色，实时监听系统切换 ──
   用法：html 元素挂 data-theme；按钮 .lg-theme-btn 点击循环；
   偏好持久化在 localStorage["lg-theme"]。 */
export function initTheme({ key = "lg-theme", onChange } = {}) {
  const colorScheme = matchMedia("(prefers-color-scheme: dark)");
  let pref = localStorage.getItem(key) || "system";
  function apply() {
    const t = pref === "system" ? (colorScheme.matches ? "dark" : "light") : pref;
    document.documentElement.dataset.theme = t;
    const btn = document.querySelector(".lg-theme-btn");
    if (btn) {
      btn.textContent = pref === "system" ? "🌗 系统" : pref === "dark" ? "🌙 黑夜" : "☀️ 白天";
      btn.title = "当前：" + (pref === "system" ? "跟随系统" : pref === "dark" ? "黑夜" : "白天") + "（点击切换）";
    }
    if (onChange) onChange(t);
  }
  function cycle() {
    pref = pref === "system" ? "dark" : pref === "dark" ? "light" : "system";
    localStorage.setItem(key, pref);
    // View Transitions：整页交叉淡化，主题切换如苹果般顺滑
    if (document.startViewTransition) document.startViewTransition(() => apply());
    else apply();
  }
  colorScheme.addEventListener("change", () => { if (pref === "system") apply(); });
  const btn = document.querySelector(".lg-theme-btn");
  if (btn) btn.addEventListener("click", cycle);
  apply();
  return { get pref() { return pref; }, cycle, apply };
}

/* ── 镜面眩光：所有 .glass 元素的高光跟随指针 ── */
export function initGlare() {
  const els = [...document.querySelectorAll(".glass")];
  addEventListener("pointermove", e => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      el.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }
  });
}

/* ── 导航/分段控制的液态药丸（容器需含 .navmover 或 .mover） ── */
export function initPill(container, { attr = "data-page", onPick } = {}) {
  const mover = container.querySelector(".navmover, .mover");
  if (!mover) return;
  const items = [...container.querySelectorAll("a[" + attr + "], button[" + attr + "]")];
  function move(target, instant) {
    mover.style.left = target.offsetLeft + "px";
    mover.style.width = target.offsetWidth + "px";
    if (!instant) mover.animate(
      springKF(0.1, -0.1, { freq: 3.5, decay: 5.4, dur: 660 }),
      { duration: 660, easing: "linear" });
  }
  items.forEach(item => item.addEventListener("click", () => {
    items.forEach(i => i.classList.toggle("on", i === item));
    move(item);
    if (onPick) onPick(item.getAttribute(attr), item);
  }));
  const current = container.querySelector("a.on, button.on") || items[0];
  if (current) move(current, true);
  return { move };
}

/* ── 非模块化用法（<script src> 直接引入时挂到全局） ── */
if (typeof window !== "undefined") {
  window.LiquidGlass = { springKF, spring, jelly, stageIn, initTheme, initGlare, initPill };
}
