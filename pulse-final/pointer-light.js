// A highlight belongs to a real hovering pointer, never to a default corner.
export function lightStep(state, target, dt, animate = true) {
  const blend = tau => animate ? 1 - Math.exp(-Math.min(dt, .05) / tau) : 1;
  const entering = target.inside && !state.inside;
  const snap = entering && state.alpha < .01;
  return {
    inside: target.inside,
    x: snap ? target.x : state.x + ((target.inside ? target.x : state.x) - state.x) * blend(.055),
    y: snap ? target.y : state.y + ((target.inside ? target.y : state.y) - state.y) * blend(.055),
    alpha: state.alpha + ((target.inside ? 1 : 0) - state.alpha) * blend(target.inside ? .065 : .075),
  };
}

export function pointerLight({ elements, canAnimate = () => true, signal }) {
  const states = new Map(elements.map(element => [element, { x: 50, y: 50, alpha: 0, inside: false }]));
  let point = null, frame = 0, previous = 0;
  const on = (target, type, callback, options = {}) => target.addEventListener(type, callback, { ...options, signal });
  const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
  function tick(now) {
    frame = 0;
    const dt = previous ? (now - previous) / 1000 : 1 / 60;
    previous = now;
    const hit = point && !document.hidden ? document.elementFromPoint(point.x, point.y) : null;
    let tracking = false;
    for (const [element, state] of states) {
      // Hit testing also handles nested controls, modal occlusion and pointer capture.
      const inside = Boolean(hit && element.contains(hit) && !element.closest('[inert]'));
      if (!inside && state.alpha === 0) continue;
      const rect = inside ? element.getBoundingClientRect() : null;
      const target = { inside, x: inside ? (point.x - rect.left) / rect.width * 100 : state.x,
        y: inside ? (point.y - rect.top) / rect.height * 100 : state.y };
      const next = lightStep(state, target, dt, canAnimate());
      if (!inside && next.alpha < .002) next.alpha = 0;
      for (const [name, value] of [['--light-x', `${next.x.toFixed(3)}%`],
        ['--light-y', `${next.y.toFixed(3)}%`], ['--pointer-light', next.alpha.toFixed(4)]]) {
        if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
      }
      states.set(element, next);
      tracking ||= inside || next.alpha > 0;
    }
    // While hovering, geometry may move underneath a stationary pointer.
    if (tracking) schedule(); else previous = 0;
  }
  function clear() { point = null; schedule(); }
  on(document, 'pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (event.pointerType === 'pen' && event.buttons) { clear(); return; }
    point = { x: event.clientX, y: event.clientY }; schedule();
  }, { passive: true });
  on(document, 'pointerdown', event => { if (event.pointerType === 'touch') clear(); }, { passive: true });
  on(document, 'pointerout', event => { if (!event.relatedTarget) clear(); });
  on(document, 'pointercancel', clear);
  on(window, 'blur', clear);
  on(document, 'visibilitychange', clear);
  on(document, 'scroll', schedule, { capture: true, passive: true });
  on(window, 'resize', schedule, { passive: true });
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'inert', 'open'] });
  const destroy = () => {
    cancelAnimationFrame(frame); observer.disconnect();
    for (const element of states.keys()) element.style.setProperty('--pointer-light', '0');
  };
  signal?.addEventListener('abort', destroy, { once: true });
  return { clear, destroy, refresh(elements) {
    const current = new Set(elements);
    for (const element of states.keys()) if (!current.has(element)) states.delete(element);
    for (const element of elements) if (!states.has(element)) states.set(element, { x: 50, y: 50, alpha: 0, inside: false });
    schedule();
  } };
}
