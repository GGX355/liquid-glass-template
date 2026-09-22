import { glide } from './motion.js';

// Average a short path instead of magnifying the last, possibly noisy, event.
export function releaseVelocity(samples, now) {
  if (samples.length < 2) return { x: 0, y: 0 };
  const last = samples.at(-1), age = Math.max(0, now - last.t);
  if (age >= 100) return { x: 0, y: 0 };
  const cutoff = now - 90;
  let first = samples[0];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].t <= cutoff) { first = samples[i]; continue; }
    if (first.t < cutoff) {
      const ratio = (cutoff - first.t) / (samples[i].t - first.t);
      first = { x: first.x + (samples[i].x - first.x) * ratio, y: first.y + (samples[i].y - first.y) * ratio, t: cutoff };
    }
    break;
  }
  const elapsed = (last.t - first.t) / 1000;
  if (elapsed < .012) return { x: 0, y: 0 };
  let x = (last.x - first.x) / elapsed, y = (last.y - first.y) / elapsed;
  const gain = Math.min(1, 1100 / Math.max(1, Math.hypot(x, y))) * Math.exp(-age / 45);
  return { x: x * gain, y: y * gain };
}

// Exact critically damped response: stable across display refresh rates.
export function settle(position, velocity, target, dt) {
  dt = Math.max(0, Math.min(.06, dt));
  const omega = 17, offset = position - target, impulse = velocity + omega * offset, decay = Math.exp(-omega * dt);
  return { position: target + (offset + impulse * dt) * decay, velocity: (velocity - omega * impulse * dt) * decay };
}

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
      samples: [{ x: element.offsetLeft, y: element.offsetTop, t: performance.now() }] };
    element.setPointerCapture(event.pointerId);
    element.focus({ preventScroll: true });
    element.classList.add('held');
  });
  on(element, 'pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const now = performance.now();
    place(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
    drag.samples.push({ x: parseFloat(element.style.left), y: parseFloat(element.style.top), t: now });
    while (drag.samples.length > 2 && drag.samples[1].t < now - 100) drag.samples.shift();
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const previous = drag; drag = null; element.classList.remove('held');
    if (event.type !== 'pointerup') return;
    bounce(element, .07);
    if (!canAnimate()) return;
    const velocity = releaseVelocity(previous.samples, performance.now());
    let x = element.offsetLeft, y = element.offsetTop, vx = velocity.x, vy = velocity.y, last = performance.now();
    if (Math.hypot(vx, vy) < 5) return;
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
  // ResizeObserver clamps a moved lens, preserving the user's placement.
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
  let frame = 0, last = 0, x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0;
  function reset() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    x = y = vx = vy = tx = ty = 0; element.style.transform = '';
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) { reset(); return; }
    const dt = last ? (now - last) / 1000 : 1 / 60; last = now;
    const ax = settle(x, vx, tx, dt), ay = settle(y, vy, ty, dt);
    x = ax.position; vx = ax.velocity; y = ay.position; vy = ay.velocity;
    element.style.transform = `perspective(650px) rotateX(${y}deg) rotateY(${x}deg)`;
    if (Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) > .015) frame = requestAnimationFrame(tick);
    else { last = 0; if (tx === 0 && ty === 0) reset(); }
  }
  function start() { if (!frame) frame = requestAnimationFrame(tick); }
  element.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !canAnimate()) return;
    // Use the stationary parent, so tilt does not move its own measurement plane.
    const rect = element.offsetParent.getBoundingClientRect();
    const px = (event.clientX - rect.left - element.offsetLeft) / element.offsetWidth;
    const py = (event.clientY - rect.top - element.offsetTop) / element.offsetHeight;
    tx = Math.max(-1, Math.min(1, (px - .5) * 2)) * 5;
    ty = Math.max(-1, Math.min(1, (py - .5) * 2)) * -5;
    start();
  }, { signal });
  for (const event of ['pointerleave', 'pointercancel', 'blur']) element.addEventListener(event, () => {
    tx = ty = 0;
    if (canAnimate()) start(); else reset();
  }, { signal });
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
