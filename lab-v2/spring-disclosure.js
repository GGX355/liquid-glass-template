// A moderately damped spring for growing/shrinking surfaces. Retargeting keeps
// both position and velocity, including when a user clicks again mid-flight.
export function disclosureStep(position, velocity, target, dt) {
  dt = Math.max(0, Math.min(.05, dt));
  const omega = 8, damping = .64, decayRate = omega * damping;
  const frequency = omega * Math.sqrt(1 - damping * damping);
  const offset = position - target, sinePart = (velocity + decayRate * offset) / frequency;
  const cosine = Math.cos(frequency * dt), sine = Math.sin(frequency * dt), decay = Math.exp(-decayRate * dt);
  const displacement = offset * cosine + sinePart * sine;
  return {
    position: target + decay * displacement,
    velocity: decay * (-decayRate * displacement - offset * frequency * sine + sinePart * frequency * cosine),
  };
}

export function springDisclosure({ element, toggle, content, canAnimate, onChange, signal }) {
  let open = toggle.getAttribute('aria-expanded') === 'true';
  let closedSize, openSize, width = 0, height = 0, vx = 0, vy = 0;
  let frame = 0, measuring = 0, last = 0, destroyed = false, ready = false;
  const destination = () => open ? openSize : closedSize;

  function paint() {
    element.style.width = `${Math.max(1, width)}px`;
    element.style.height = `${Math.max(1, height)}px`;
    const span = openSize.height - closedSize.height;
    const reveal = span ? Math.max(0, Math.min(1, (height - closedSize.height) / span)) : Number(open);
    element.style.setProperty('--disclosure-reveal', String(reveal));
  }
  function finish() {
    if (!ready) return;
    cancelAnimationFrame(frame); frame = 0; last = 0; vx = vy = 0;
    ({ width, height } = destination());
    paint(); element.dataset.disclosureState = open ? 'open' : 'closed';
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) { finish(); return; }
    const dt = last ? (now - last) / 1000 : 1 / 60; last = now;
    const target = destination();
    const horizontal = disclosureStep(width, vx, target.width, dt);
    const vertical = disclosureStep(height, vy, target.height, dt);
    width = horizontal.position; vx = horizontal.velocity;
    height = vertical.position; vy = vertical.velocity;
    paint();
    if (Math.abs(width - target.width) + Math.abs(height - target.height) < .12 && Math.abs(vx) + Math.abs(vy) < .5) finish();
    else frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!canAnimate()) { finish(); return; }
    element.dataset.disclosureState = open ? 'opening' : 'closing';
    if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }

  function measure() {
    measuring = 0;
    if (destroyed) return;
    // Read the responsive CSS endpoints synchronously, without painting them.
    // The former max-width/auto-height changes cannot jump the animated surface.
    element.setAttribute('data-disclosure-measuring', '');
    element.classList.remove('spring-disclosure', 'expanded');
    element.style.removeProperty('width'); element.style.removeProperty('height');
    closedSize = { width: element.getBoundingClientRect().width, height: toggle.getBoundingClientRect().height };
    element.classList.add('expanded');
    const expandedWidth = element.getBoundingClientRect().width;
    element.style.setProperty('--disclosure-content-width', `${expandedWidth}px`);
    element.style.setProperty('--disclosure-header-height', `${closedSize.height}px`);
    element.classList.add('spring-disclosure');
    openSize = { width: expandedWidth, height: closedSize.height + content.firstElementChild.getBoundingClientRect().height };
    element.classList.toggle('expanded', open);
    if (!ready) { ready = true; finish(); }
    else { paint(); start(); }
    element.removeAttribute('data-disclosure-measuring');
  }
  function scheduleMeasure() {
    if (!destroyed && !measuring) measuring = requestAnimationFrame(measure);
  }
  function setOpen(value) {
    if (destroyed || open === value) return;
    open = value;
    if (!open && content.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    toggle.setAttribute('aria-expanded', String(open));
    content.inert = !open;
    element.classList.toggle('expanded', open);
    onChange?.(open);
    start();
  }
  toggle.addEventListener('click', () => setOpen(!open), { signal });
  measure();
  // Width changes on the header are the animation itself. Only observe its
  // natural height, otherwise we'd remeasure the endpoints on every frame.
  let parentWidth = element.parentElement.clientWidth;
  let contentHeight = content.firstElementChild.getBoundingClientRect().height;
  let headerHeight = toggle.getBoundingClientRect().height;
  const observer = new ResizeObserver(() => {
    const nextParent = element.parentElement.clientWidth;
    const nextContent = content.firstElementChild.getBoundingClientRect().height;
    const nextHeader = toggle.getBoundingClientRect().height;
    if (nextParent !== parentWidth || Math.abs(nextContent - contentHeight) > .1 || Math.abs(nextHeader - headerHeight) > .1) scheduleMeasure();
    parentWidth = nextParent; contentHeight = nextContent; headerHeight = nextHeader;
  });
  observer.observe(element.parentElement);
  observer.observe(content.firstElementChild);
  observer.observe(toggle);
  document.fonts?.ready.then(() => { if (!destroyed) scheduleMeasure(); });
  return {
    setOpen,
    syncMotion() { if (!canAnimate()) finish(); },
    destroy() {
      destroyed = true; cancelAnimationFrame(frame); cancelAnimationFrame(measuring); observer.disconnect();
      element.classList.remove('spring-disclosure');
      for (const name of ['width', 'height', '--disclosure-content-width', '--disclosure-header-height', '--disclosure-reveal']) element.style.removeProperty(name);
      delete element.dataset.disclosureState;
    },
  };
}
