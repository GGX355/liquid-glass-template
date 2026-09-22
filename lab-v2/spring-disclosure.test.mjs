import test from 'node:test';
import assert from 'node:assert/strict';
import { disclosureStep } from './spring-disclosure.js';

const run = (from, to, hz, seconds) => {
  let position = from, velocity = 0, peak = from;
  for (let i = 0; i < hz * seconds; i++) {
    ({ position, velocity } = disclosureStep(position, velocity, to, 1 / hz));
    peak = Math.max(peak, position);
  }
  return { position, velocity, peak };
};
test('disclosure grows gradually, overshoots slightly, then settles at all refresh rates', () => {
  const outcomes = [30, 60, 120].map(hz => run(88, 250, hz, 3));
  for (const state of outcomes) {
    assert.ok(state.peak > 256 && state.peak < 265);
    assert.ok(Math.abs(state.position - 250) < .01);
    assert.ok(Math.abs(state.velocity) < .01);
  }
  assert.ok(Math.abs(outcomes[0].position - outcomes[2].position) < 1e-9);
  const early = run(88, 250, 60, .1);
  assert.ok(early.position > 100 && early.position < 160);
});
test('closing uses the same continuous response as opening', () => {
  let opening = { position:88, velocity:0 }, closing = { position:250, velocity:0 };
  for (let i = 0; i < 120; i++) {
    opening = disclosureStep(opening.position, opening.velocity, 250, 1/60);
    closing = disclosureStep(closing.position, closing.velocity, 88, 1/60);
    assert.ok(Math.abs(opening.position + closing.position - 338) < 1e-8);
  }
});
test('rapid reversals preserve current position and velocity, then converge to the latest target', () => {
  let state = run(88, 250, 60, .2);
  const sameInstant = disclosureStep(state.position, state.velocity, 88, 0);
  assert.ok(Math.abs(sameInstant.position - state.position) < 1e-9);
  assert.ok(Math.abs(sameInstant.velocity - state.velocity) < 1e-9);
  for (let i = 0; i < 45; i++) state = disclosureStep(state.position, state.velocity, i % 2 ? 250 : 88, 1/60);
  for (let i = 0; i < 180; i++) state = disclosureStep(state.position, state.velocity, 88, 1/60);
  assert.ok(Math.abs(state.position - 88) < .001);
  assert.ok(Math.abs(state.velocity) < .001);
});
test('stalled tabs cannot introduce giant size jumps', () => {
  const stalled = disclosureStep(88, 0, 250, 300);
  const bounded = disclosureStep(88, 0, 250, .05);
  assert.deepEqual(stalled, bounded);
  assert.ok(stalled.position > 88 && stalled.position < 110);
  assert.deepEqual(disclosureStep(88, 0, 250, -1), { position:88, velocity:0 });
});
