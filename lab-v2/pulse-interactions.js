import { glide } from './motion.js';

// Pointer capture keeps drags continuous beyond the lens, without blocking page
// scrolling anywhere else. The existing lab optics only resize when necessary.
export function draggableLens({ element, scene, canAnimate, bounce, signal }) {
  const on = (target, event, handler) => target.addEventListener(event, handler, { signal });
  let drag = null, flight = 0, positioned = false, atHome = true;
  const bounds = () => ({
    minX: 12, minY: scene.clientWidth < 600 ? 94 : 108,
    maxX: Math.max(12, scene.clientWidth - element.offsetWidth - 12),
    maxY: Math.max(108, scene.clientHeight - element.offsetHeight - 45),
  });
  function place(x, y) {
    const b = bounds();
    element.style.left = `${Math.max(b.minX, Math.min(b.maxX, x))}px`;
    element.style.top = `${Math.max(b.minY, Math.min(b.maxY, y))}px`;
  }
  function stop() { cancelAnimationFrame(flight); flight = 0; }
  function home() {
    stop();
    atHome = true;
    if (!element.offsetWidth) return;
    const b = bounds(), narrow = scene.clientWidth < 600;
    place(narrow ? (scene.clientWidth - element.offsetWidth) / 2 : b.maxX * .72,
      narrow ? b.maxY - 28 : b.minY + (b.maxY - b.minY) * .60);
    positioned = true;
  }
  on(element, 'pointerdown', event => {
    if (event.button !== 0 || drag) return;
    stop();
    atHome = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.offsetLeft, top: element.offsetTop,
      lastX: event.clientX, lastY: event.clientY, time: performance.now(), vx: 0, vy: 0 };
    element.setPointerCapture(event.pointerId);
    element.focus({ preventScroll: true });
    element.classList.add('held');
  });
  on(element, 'pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const now = performance.now(), dt = Math.max(.008, (now - drag.time) / 1000);
    drag.vx = Math.max(-1400, Math.min(1400, (event.clientX - drag.lastX) / dt));
    drag.vy = Math.max(-1400, Math.min(1400, (event.clientY - drag.lastY) / dt));
    drag.lastX = event.clientX; drag.lastY = event.clientY; drag.time = now;
    place(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const previous = drag; drag = null; element.classList.remove('held');
    if (event.type !== 'pointerup') return;
    bounce(element, .07);
    if (!canAnimate() || performance.now() - previous.time > 120) return;
    let x = element.offsetLeft, y = element.offsetTop, vx = previous.vx, vy = previous.vy, last = performance.now();
    const tick = now => {
      if (!canAnimate()) { flight = 0; return; }
      const dt = (now - last) / 1000; last = now;
      const b = bounds(), ax = glide(x, vx, dt, b.minX, b.maxX), ay = glide(y, vy, dt, b.minY, b.maxY);
      x = ax.position; vx = ax.velocity; y = ay.position; vy = ay.velocity; place(x, y);
      if (Math.hypot(vx, vy) > 5) flight = requestAnimationFrame(tick); else flight = 0;
    };
    flight = requestAnimationFrame(tick);
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) on(element, event, release);
  on(element, 'keydown', event => {
    if (event.key === 'Home') { event.preventDefault(); home(); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault(); stop();
    atHome = false;
    const step = event.shiftKey ? 32 : 16;
    place(element.offsetLeft + direction[0] * step, element.offsetTop + direction[1] * step);
  });
  const resize = new ResizeObserver(() => {
    if (!element.offsetWidth) return;
    if (!positioned || atHome) home(); else place(element.offsetLeft, element.offsetTop);
  });
  resize.observe(element); resize.observe(scene);
  on(window, 'resize', home);
  home();
  return {
    home, stop,
    cancel() {
      stop();
      const id = drag?.id; drag = null; element.classList.remove('held');
      if (id !== undefined && element.hasPointerCapture(id)) element.releasePointerCapture(id);
    },
    destroy() { this.cancel(); resize.disconnect(); },
  };
}

export function tiltCard({ element, canAnimate, signal }) {
  let frame = 0;
  function reset() { cancelAnimationFrame(frame); frame = 0; element.style.transform = ''; }
  element.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !canAnimate()) return;
    const rect = element.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (canAnimate()) element.style.transform = `perspective(650px) rotateX(${(y - .5) * -10}deg) rotateY(${(x - .5) * 10}deg)`;
      frame = 0;
    });
  }, { signal });
  for (const event of ['pointerleave', 'pointercancel', 'blur']) element.addEventListener(event, reset, { signal });
  return { reset, destroy: reset };
}

export function themeControl({ button, signal }) {
  const key = 'pulse-liquid-theme', system = matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { const saved = localStorage.getItem(key); if (['system', 'dark', 'light'].includes(saved)) preference = saved; } catch { /* Storage can be unavailable in private contexts. */ }
  const apply = () => {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    document.body.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const label = { system: '跟随系统', dark: '深色', light: '浅色' }[preference];
    button.setAttribute('aria-label', `主题：${label}`);
    button.title = `当前${label}，点击切换`;
    button.querySelector('.theme-label').textContent = preference === 'system' ? '随系统' : label;
    button.firstElementChild.textContent = { system: '◐', dark: '☾', light: '☼' }[preference];
    document.querySelector('meta[name="theme-color"]').content = dark ? '#111b19' : '#f7f7f2';
  };
  button.addEventListener('click', () => {
    preference = { system: 'dark', dark: 'light', light: 'system' }[preference];
    try { localStorage.setItem(key, preference); } catch { /* Keep the selected theme for this page. */ }
    apply();
  }, { signal });
  system.addEventListener('change', () => { if (preference === 'system') apply(); }, { signal });
  apply();
}
