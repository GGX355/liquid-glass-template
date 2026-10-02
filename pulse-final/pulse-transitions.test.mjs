import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogTransitions, panelTransitions } from './pulse-transitions.js';

function fixture(t, prepare) {
  const oldDocument = globalThis.document, oldStyle = globalThis.getComputedStyle;
  const opener = { isConnected: true, focused: 0, focus() { this.focused++; } };
  globalThis.document = { activeElement: opener };
  globalThis.getComputedStyle = () => ({ opacity: '.6', translate: '0 8px' });
  t.after(() => {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = oldStyle;
  });
  const animations = [];
  const surface = { children: [], animate(frames, options) {
    let resolve, reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = { frames, options, finished, finish: resolve, cancel: () => reject(new Error('cancelled')) };
    animations.push(animation); return animation;
  } };
  const dialog = new EventTarget();
  Object.assign(dialog, { open: false, closes: 0, classList: { add() {}, remove() {}, toggle() {} }, querySelector: selector => selector === '.dialog-glass' ? surface : null,
    showModal() { this.open = true; }, close() { this.open = false; this.closes++; } });
  let motion = true;
  const controller = dialogTransitions({ dialog, prepare, canAnimate: () => motion, signal: new AbortController().signal });
  t.after(() => controller.destroy());
  return { dialog, animations, controller, opener, reduce: () => { motion = false; controller.syncMotion(); } };
}

test('dialog exit keeps focus trapped until the visual transition finishes, callback runs once', async t => {
  const f = fixture(t); let confirmed = 0;
  f.controller.open(); f.controller.close(() => confirmed++); f.controller.close(() => confirmed++);
  assert.equal(f.dialog.open, true); assert.equal(confirmed, 0);
  f.animations.at(-1).finish(); await Promise.resolve();
  assert.equal(f.dialog.open, false); assert.equal(f.dialog.closes, 1);
  assert.equal(confirmed, 1); assert.equal(f.opener.focused, 1);
});
test('reopening interrupts a pending exit without a stale close or callback', async t => {
  const f = fixture(t); let stale = false;
  f.controller.open(); f.controller.close(() => { stale = true; });
  const exit = f.animations.at(-1); f.controller.open(); exit.finish(); await Promise.resolve();
  assert.equal(f.dialog.open, true); assert.equal(f.dialog.closes, 0); assert.equal(stale, false);
});
test('reduced motion during exit finishes immediately without double closing', async t => {
  const f = fixture(t); let callbacks = 0;
  f.controller.open(); f.controller.close(() => callbacks++); f.reduce(); await Promise.resolve();
  assert.equal(f.dialog.open, false); assert.equal(f.dialog.closes, 1); assert.equal(callbacks, 1);
});
test('Escape uses the same exit and reduced motion skips animations', t => {
  const f = fixture(t); f.reduce(); f.controller.open();
  const escape = new Event('cancel', { cancelable: true }); f.dialog.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true); assert.equal(f.dialog.open, false);
  assert.equal(f.animations.length, 0); assert.equal(f.opener.focused, 1);
});

test('dialog decodes its sized glass before entering, with opacity confined to pseudo layers', async t => {
  let ready;
  const f = fixture(t, () => new Promise(resolve => { ready = resolve; }));
  f.controller.open();
  await Promise.resolve();
  assert.equal(f.dialog.open, true, 'native modal layout is available for sizing');
  assert.equal(f.animations.length, 0, 'entrance cannot start before decoding');
  ready(); await new Promise(resolve => setImmediate(resolve));
  const geometry = f.animations.filter(a => !a.options.pseudoElement);
  assert.ok(geometry.length > 0);
  assert.ok(geometry.every(a => a.frames.every(frame => !Object.hasOwn(frame, 'opacity'))));
  assert.deepEqual(f.animations.filter(a => a.options.pseudoElement).map(a => a.options.pseudoElement), ['::before', '::after']);
});

test('closing during decoding cannot reopen the dialog on a stale completion', async t => {
  let ready;
  const f = fixture(t, () => new Promise(resolve => { ready = resolve; }));
  f.controller.open(); await Promise.resolve();
  f.controller.close(); ready();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.dialog.open, false);
  assert.equal(f.animations.length, 0);
  assert.equal(f.opener.focused, 1);
});

test('failed material preparation leaves an operable dialog rather than a hidden modal', async t => {
  const f = fixture(t, () => Promise.reject(new Error('decode failure')));
  f.controller.open();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(f.animations.length > 0);
  f.reduce(); f.controller.close();
  assert.equal(f.dialog.open, false);
});

test('pre-rendered panel nodes are reused and focus leaves a panel before it becomes inert', t => {
  const oldDocument = globalThis.document;
  globalThis.document = { activeElement: null };
  t.after(() => { globalThis.document = oldDocument; });
  function node() {
    const classes = new Set(), attrs = new Map();
    return { classes, attrs, inert: false,
      classList: { add: value => classes.add(value), toggle: (value, active) => active ? classes.add(value) : classes.delete(value) },
      setAttribute: (name, value) => attrs.set(name, value),
      contains(element) { return element === this; },
      focus() { document.activeElement = this; },
      querySelector() { return this; },
    };
  }
  const names = ['explore', 'poll', 'draw'];
  const stories = names.map(name => Object.assign(node(), { dataset: { story: name } }));
  const nodes = new Map(names.flatMap(name => [[`#${name}-panel`, node()], [`#${name}-tab`, node()]]));
  nodes.set('#poll-form-state', node()); nodes.set('#poll-result', node());
  const stage = Object.assign(node(), { dataset: { view: 'explore' },
    querySelector: selector => nodes.get(selector), querySelectorAll: () => stories });
  const controller = panelTransitions({ stage });
  assert.equal(nodes.get('#explore-panel').inert, false);
  assert.equal(nodes.get('#poll-panel').inert, true);
  document.activeElement = nodes.get('#explore-panel');
  controller.setMode('poll');
  assert.equal(document.activeElement, nodes.get('#poll-tab'));
  assert.equal(nodes.get('#poll-panel').inert, false);
  assert.equal(nodes.get('#explore-panel').attrs.get('aria-hidden'), 'true');
  controller.setResult(true);
  assert.equal(nodes.get('#poll-form-state').inert, true);
  assert.equal(nodes.get('#poll-result').inert, false);
  assert.equal(document.activeElement, nodes.get('#poll-result'));
  assert.ok(stories[1].classes.has('is-current'));
});
