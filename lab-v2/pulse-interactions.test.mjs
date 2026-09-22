import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseVelocity, settle } from './pulse-interactions.js';

test('release speed is consistent at 30, 60 and 120 pointer samples per second', () => {
  for (const hz of [30, 60, 120]) {
    const path = Array.from({ length: hz + 1 }, (_, i) => ({ x: 500 * i / hz, y: -200 * i / hz, t: 1000 * i / hz }));
    const speed = releaseVelocity(path, 1000);
    assert.ok(Math.abs(speed.x - 500) < 1e-8);
    assert.ok(Math.abs(speed.y + 200) < 1e-8);
  }
});
test('holding still, clamped movement, and incomplete samples do not launch a lens', () => {
  assert.deepEqual(releaseVelocity([], 0), { x: 0, y: 0 });
  assert.deepEqual(releaseVelocity([{x:0,y:0,t:0},{x:100,y:100,t:1}], 1), { x: 0, y: 0 });
  assert.deepEqual(releaseVelocity([{x:0,y:0,t:0},{x:100,y:100,t:50}], 200), { x: 0, y: 0 });
  assert.deepEqual(releaseVelocity([{x:10,y:20,t:0},{x:10,y:20,t:100}], 100), { x: 0, y: 0 });
});
test('diagonal flicks are capped as a vector and isolated jitter is averaged', () => {
  const fast = releaseVelocity([{x:0,y:0,t:0},{x:1000,y:1000,t:20}], 20);
  assert.ok(Math.hypot(fast.x, fast.y) <= 1100.000001);
  const noisy = releaseVelocity([{x:0,y:0,t:0},{x:40,y:0,t:80},{x:47,y:0,t:81}], 81);
  assert.ok(noisy.x < 600);
});
test('card spring converges without overshooting across refresh rates', () => {
  for (const hz of [30, 60, 120]) {
    let p = 0, v = 0;
    for (let i = 0; i < hz; i++) {
      const next = settle(p, v, 5, 1 / hz);
      assert.ok(next.position >= p && next.position <= 5);
      p = next.position; v = next.velocity;
    }
    assert.ok(Math.abs(p - 5) < .00001);
    assert.ok(Math.abs(v) < .0001);
    const stalled = settle(p, v, 0, 20);
    assert.ok(Number.isFinite(stalled.position));
    assert.ok(stalled.position > 3);
  }
});
