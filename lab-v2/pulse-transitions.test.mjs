import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogTransitions } from './pulse-transitions.js';

function fixture(t) {
  const oldDocument = globalThis.document, oldStyle = globalThis.getComputedStyle;
  const opener = { isConnected: true, focused: 0, focus() { this.focused++; } };
  globalThis.document = { activeElement: opener };
  globalThis.getComputedStyle = () => ({ opacity: '.6', translate: '0 8px' });
  t.after(() => {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = oldStyle;
  });
  const animations = [];
  const surface = { animate() {
    let resolve, reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = { finished, finish: resolve, cancel: () => reject(new Error('cancelled')) };
    animations.push(animation); return animation;
  } };
  const dialog = new EventTarget();
  Object.assign(dialog, { open: false, closes: 0, querySelector: () => surface,
    showModal() { this.open = true; }, close() { this.open = false; this.closes++; } });
  let motion = true;
  const controller = dialogTransitions({ dialog, canAnimate: () => motion, signal: new AbortController().signal });
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
