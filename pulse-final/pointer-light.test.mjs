import test from 'node:test';
import assert from 'node:assert/strict';
import { lightStep } from './pointer-light.js';

test('first entry starts at the real pointer, while intensity fades in', () => {
  const next = lightStep({ x: 50, y: 50, alpha: 0, inside: false }, { x: 90, y: 85, inside: true }, 1 / 60);
  assert.equal(next.x, 90); assert.equal(next.y, 85);
  assert.ok(next.alpha > 0 && next.alpha < .3);
});
test('exit fades at the last position instead of flying back to a corner', () => {
  let state = { x: 90, y: 85, alpha: 1, inside: true };
  for (let i = 0; i < 30; i++) state = lightStep(state, { x: 0, y: 0, inside: false }, 1 / 60);
  assert.equal(state.x, 90); assert.equal(state.y, 85);
  assert.ok(state.alpha < .002);
});
test('moving and reversing smoothly converges at both 60 and 144 Hz', () => {
  for (const hz of [60, 144]) {
    let state = { x: 10, y: 10, alpha: 1, inside: true };
    state = lightStep(state, { x: 90, y: 90, inside: true }, 1 / hz);
    assert.ok(state.x > 10 && state.x < 90);
    for (let i = 0; i < hz; i++) state = lightStep(state, { x: 5, y: 5, inside: true }, 1 / hz);
    assert.ok(Math.abs(state.x - 5) < .001);
  }
});
test('reduced motion updates immediately and a new untouched panel stays unlit', () => {
  const blank = { x: 50, y: 50, alpha: 0, inside: false };
  assert.equal(lightStep(blank, { inside: false }, .016).alpha, 0);
  const lit = lightStep(blank, { x: 80, y: 70, inside: true }, .016, false);
  assert.equal(lit.alpha, 1); assert.equal(lit.x, 80);
  assert.equal(lightStep(lit, { inside: false }, .016, false).alpha, 0);
});
