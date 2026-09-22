// Keep natural layout space for every state; only visual layers move/fade.
// CSS transitions retarget from their current presentation on rapid input.
export function panelTransitions({ stage, stories }) {
  const find = selector => stage.querySelector(selector);
  const host = find('.stage-story');
  const original = [find('.story-kicker'), find('#story-title'), find('#story-copy')];
  const stack = document.createElement('div');
  stack.className = 'story-stack';
  host.prepend(stack);
  const storyLayers = new Map();
  for (const [name, story] of Object.entries(stories)) {
    const layer = document.createElement('div');
    layer.className = 'story-slide mode-layer';
    const [kicker, title, copy] = original.map(element => element.cloneNode(true));
    for (const node of [kicker, title, copy, ...kicker.querySelectorAll('[id]')]) node.removeAttribute('id');
    kicker.lastElementChild.textContent = story.kicker;
    title.replaceChildren(document.createTextNode(story.title[0]), document.createElement('br'), document.createTextNode(story.title[1]));
    copy.replaceChildren(document.createTextNode(story.copy.split('\n')[0]), document.createElement('br'), document.createTextNode(story.copy.split('\n')[1]));
    layer.append(kicker, title, copy); stack.append(layer); storyLayers.set(name, layer);
  }
  original.forEach(element => element.remove());
  const panels = new Map(Object.keys(stories).map(name => [name, find(`#${name}-panel`)]));
  const form = find('#poll-form-state'), result = find('#poll-result');
  const pollStack = document.createElement('div');
  pollStack.className = 'poll-state-stack'; form.before(pollStack); pollStack.append(form, result);
  const layers = [...storyLayers.values(), ...panels.values(), form, result];
  for (const layer of layers) { layer.hidden = false; layer.classList.add('mode-layer'); }
  function active(layer, current) {
    layer.classList.toggle('is-current', current);
    layer.inert = !current;
    layer.setAttribute('aria-hidden', String(!current));
  }
  function setMode(mode) {
    const next = panels.get(mode);
    active(next, true); active(storyLayers.get(mode), true);
    for (const [name, panel] of panels) if (name !== mode) {
      if (panel.contains(document.activeElement)) find(`#${mode}-tab`).focus({ preventScroll: true });
      active(panel, false); active(storyLayers.get(name), false);
    }
  }
  function setResult(confirmed, focus = true) {
    const incoming = confirmed ? result : form, outgoing = confirmed ? form : result;
    active(incoming, true);
    if (focus) incoming.querySelector(confirmed ? 'button' : 'input').focus({ preventScroll: true });
    active(outgoing, false);
  }
  setMode(stage.dataset.view); setResult(false, false);
  stage.classList.add('mode-ready');
  return { setMode, setResult };
}

// Keep the native dialog (focus trap/Escape/return), with an interruptible exit.
export function dialogTransitions({ dialog, canAnimate, signal }) {
  const surface = dialog.querySelector('.dialog-glass');
  let animation = null, closing = false, afterClose = null, opener = null;
  function cancelAnimation() { animation?.cancel(); animation = null; }
  function finishClose() {
    cancelAnimation(); closing = false;
    const callback = afterClose; afterClose = null;
    dialog.close();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    callback?.();
  }
  function open() {
    if (!dialog.open) opener = document.activeElement;
    cancelAnimation(); closing = false; afterClose = null;
    if (!dialog.open) dialog.showModal();
    if (canAnimate()) {
      animation = surface.animate([
        { opacity: 0, translate: '0 22px' },
        { opacity: 1, translate: '0 -2px', offset: .72 },
        { opacity: 1, translate: '0 0' },
      ], { duration: 520, easing: 'cubic-bezier(.2,.75,.25,1)' });
      animation.finished.catch(() => {});
    }
  }
  function close(callback) {
    if (!dialog.open || closing) return;
    afterClose = callback; closing = true;
    const current = getComputedStyle(surface);
    const start = { opacity: current.opacity, translate: current.translate };
    cancelAnimation();
    if (!canAnimate()) { finishClose(); return; }
    animation = surface.animate([start, { opacity: 0, translate: '0 14px' }], { duration: 190, easing: 'ease-in', fill: 'forwards' });
    animation.finished.then(finishClose).catch(() => {});
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, { signal });
  return {
    open, close,
    syncMotion() { if (!canAnimate()) { if (closing) finishClose(); else cancelAnimation(); } },
    destroy: cancelAnimation,
  };
}
