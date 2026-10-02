// Analytic damped motion: interruption preserves velocity instead of restarting
// a canned animation. Kept separate from the original Liquid / 02 reference.
export function springStep(position, velocity, target, dt, omega = 14, damping = .62) {
  dt = Math.max(0, Math.min(.05, dt));
  const decayRate = omega * damping, frequency = omega * Math.sqrt(1 - damping * damping);
  const offset = position - target, b = (velocity + decayRate * offset) / frequency;
  const c = Math.cos(frequency * dt), s = Math.sin(frequency * dt), decay = Math.exp(-decayRate * dt);
  return { position: target + decay * (offset * c + b * s),
    velocity: decay * (-decayRate * (offset * c + b * s) - offset * frequency * s + b * frequency * c) };
}

export function surfaceFrames(start = { opacity: 0, x: .84, y: .72, offset: 28 }) {
  const frames = [];
  let progress = 0, velocity = 0;
  for (let i = 0; i <= 64; i++) {
    if (i) ({ position: progress, velocity } = springStep(progress, velocity, 1, 1 / 60, 11, .58));
    if (i === 64) progress = 1;
    const mix = value => value + (1 - value) * progress;
    frames.push({ offset: i / 64, opacity: Math.min(1, start.opacity + i / 9),
      scale: `${mix(start.x)} ${mix(start.y)}`, translate: `0 ${start.offset * (1 - progress)}px` });
  }
  return frames;
}

export function elasticFeedback({ canAnimate }) {
  const items = new Map();
  let frame = 0, last = 0;
  function stop() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    for (const element of items.keys()) element.style.removeProperty('scale');
    items.clear();
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) { stop(); return; }
    const dt = last ? (now - last) / 1000 : 1 / 60; last = now;
    for (const [element, state] of items) {
      const next = springStep(state.position, state.velocity, 0, dt, 19, .55);
      items.set(element, next);
      element.style.scale = `${1 + next.position} ${1 - next.position}`;
      if (Math.abs(next.position) < .0002 && Math.abs(next.velocity) < .004) {
        element.style.removeProperty('scale'); items.delete(element);
      }
    }
    if (items.size) frame = requestAnimationFrame(tick); else last = 0;
  }
  return {
    pulse(element, amount = .04) {
      if (!canAnimate()) return;
      const state = items.get(element) || { position: 0, velocity: 0 };
      state.velocity = Math.min(4, Math.max(-4, state.velocity + amount * 35));
      items.set(element, state);
      if (!frame) frame = requestAnimationFrame(tick);
    }, stop,
  };
}

export function elasticNavigation({ rail, canAnimate }) {
  const indicator = rail.querySelector('.nav-indicator');
  let position = 0, velocity = 0, target = 0, frame = 0, last = 0;
  function paint() {
    indicator.style.translate = `${position * 100}% 0`;
    const stretch = Math.min(.18, Math.abs(velocity) * .027);
    indicator.style.scale = `${1 + stretch} ${1 - stretch * .45}`;
  }
  function finish() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    position = target; velocity = 0; paint();
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) { finish(); return; }
    const dt = last ? (now - last) / 1000 : 1 / 60; last = now;
    ({ position, velocity } = springStep(position, velocity, target, dt));
    paint();
    if (Math.abs(position - target) < .0002 && Math.abs(velocity) < .004) finish();
    else frame = requestAnimationFrame(tick);
  }
  rail.classList.add('elastic-nav');
  return {
    select(index) { target = index; if (!canAnimate()) finish(); else if (!frame) frame = requestAnimationFrame(tick); },
    syncMotion() { if (!canAnimate()) finish(); },
    destroy() { finish(); rail.classList.remove('elastic-nav'); indicator.style.removeProperty('translate'); indicator.style.removeProperty('scale'); },
  };
}
