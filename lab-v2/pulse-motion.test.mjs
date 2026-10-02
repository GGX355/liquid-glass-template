import test from 'node:test';
import assert from 'node:assert/strict';
import { springStep, surfaceFrames } from './pulse-motion.js';

function simulate(hz, duration = 2) {
  let position = 0, velocity = 0, peak = 0;
  for (let i = 0; i < hz * duration; i++) {
    ({ position, velocity } = springStep(position, velocity, 1, 1 / hz));
    peak = Math.max(peak, position);
  }
  return { position, velocity, peak };
}
test('spring visibly overshoots without sustained oscillation at 60 and 144 Hz', () => {
  for (const hz of [60, 144]) {
    const state = simulate(hz);
    assert.ok(state.peak > 1.05 && state.peak < 1.12);
    assert.ok(Math.abs(state.position - 1) < .001);
    assert.ok(Math.abs(state.velocity) < .001);
  }
  assert.ok(Math.abs(simulate(60).position - simulate(144).position) < .00001);
});
test('mid-flight retargeting carries momentum and converges on the new choice', () => {
  let state = springStep(0, 0, 2, .05);
  const before = state;
  state = springStep(state.position, state.velocity, 0, .001);
  assert.ok(state.position > before.position, 'movement must not jump back on a new click');
  assert.ok(Math.abs(state.position - before.position) < .02);
  for (let i = 0; i < 180; i++) state = springStep(state.position, state.velocity, 0, 1 / 60);
  assert.ok(Math.abs(state.position) < .001);
});
test('dialog keeps elastic geometry without creating an opacity backdrop root', () => {
  const frames = surfaceFrames();
  assert.equal(frames[0].scale, '0.84 0.72');
  assert.ok(frames.some(frame => Number(frame.scale.split(' ')[1]) > 1.02));
  assert.ok(frames.every(frame => !Object.hasOwn(frame, 'opacity')));
  assert.equal(frames.at(-1).scale, '1 1');
  const reversed = surfaceFrames({ opacity: .7, x: .95, y: .92, offset: 4 });
  assert.equal(reversed[0].scale, '0.95 0.92');
  assert.ok(!Object.hasOwn(reversed[0], 'opacity'));
});
