import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { revealGlassPage } from './liquid-glass.js';

function boot(page) {
  const html = readFileSync(new URL(page, import.meta.url), 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const classes = new Set(), timers = new Map(), events = new Map();
  const root = { classList: { add: x => classes.add(x), remove: x => classes.delete(x) }, dataset: {} };
  vm.runInNewContext(source, {
    document: { documentElement: root, addEventListener: (e, f) => events.set(e, f), removeEventListener: e => events.delete(e) },
    setTimeout: (f, delay) => { timers.set(delay, f); return delay; },
    clearTimeout: id => timers.delete(id),
  });
  return { root, classes, timers, events };
}

for (const page of ['pulse.html', 'index.html']) {
  test(`${page}: ready reveals once and cancels the blank-page watchdog`, () => {
    const b = boot(page), ready = b.events.get('glass-ready');
    assert.ok(b.classes.has('glass-booting'));
    ready();
    assert.equal(b.root.dataset.glassStartup, 'ready');
    assert.ok(!b.classes.has('glass-booting'));
    assert.ok(!b.timers.has(1800));
    b.timers.get(220)();
    ready();
    assert.ok(!b.classes.has('glass-entering'), 'late readiness must not replay the entrance');
  });
  test(`${page}: failed module loading cannot leave the content hidden`, () => {
    const b = boot(page), ready = b.events.get('glass-ready');
    b.timers.get(1800)();
    assert.ok(!b.classes.has('glass-booting'));
    assert.equal(b.root.dataset.glassStartup, 'fallback');
    ready();
    assert.equal(b.root.dataset.glassStartup, 'fallback');
  });
}

test('first reveal waits for decoding and two compositor frames; failures settle', async t => {
  let decoded, event;
  const frames = [];
  const oldDocument = globalThis.document, oldFrame = globalThis.requestAnimationFrame;
  t.after(() => { globalThis.document = oldDocument; globalThis.requestAnimationFrame = oldFrame; });
  globalThis.document = { dispatchEvent: e => { event = e.type; } };
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  const ready = new Promise(resolve => { decoded = resolve; });
  const revealing = revealGlassPage([{ ready }, { ready: Promise.reject(new Error('decode failed')) }]);
  await Promise.resolve();
  assert.equal(frames.length, 0);
  decoded();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(event, undefined);
  frames.shift()();
  assert.equal(event, undefined);
  frames.shift()();
  await revealing;
  assert.equal(event, 'glass-ready');
});
