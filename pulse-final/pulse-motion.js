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

export function surfaceFrames(start = { x: .84, y: .72, offset: 28 }) {
  const frames = [];
  let progress = 0, velocity = 0;
  for (let i = 0; i <= 64; i++) {
    if (i) ({ position: progress, velocity } = springStep(progress, velocity, 1, 1 / 60, 11, .58));
    if (i === 64) progress = 1;
    const mix = value => value + (1 - value) * progress;
    // Opacity on this parent creates a backdrop root for its glass pseudo.
    // Animate geometry here; fade the material and text on their own layers.
    frames.push({ offset: i / 64,
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

// Exact motion recipe from experience.js / #nav-pill in visual.css. The left
// transition retargets naturally; the 520ms squash is the original lab bounce.
export function labNavigation({ rail, canAnimate }) {
  const indicator = rail.querySelector('.nav-indicator');
  let animation = null;
  const stop = () => { animation?.cancel(); animation = null; };
  rail.classList.add('lab-nav');
  return {
    select(index) {
      indicator.style.left = `calc(7px + (100% - 14px) * ${index}/3)`;
      stop();
      if (!canAnimate()) return;
      const amount = .13;
      animation = indicator.animate([
        { scale: `${1 + amount} ${1 - amount}` },
        { scale: `${1 - amount * .4} ${1 + amount * .4}`, offset: .6 },
        { scale: '1 1' },
      ], { duration: 520, easing: 'cubic-bezier(.2,.75,.3,1)' });
      animation.finished.catch(() => {});
    },
    syncMotion() { if (!canAnimate()) stop(); },
    destroy() { stop(); rail.classList.remove('lab-nav'); indicator.style.removeProperty('left'); },
  };
}
