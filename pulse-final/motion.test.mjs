import test from 'node:test';
import assert from 'node:assert/strict';
import { glide } from './motion.js';

test('free glide travels equally at 30, 60 and 120 Hz',()=>{
  const run=hz=>{let s={position:500,velocity:600};for(let i=0;i<hz;i++)s=glide(s.position,s.velocity,1/hz,0,2000);return s;};
  const expected=run(60);
  for(const hz of [30,120]){const s=run(hz);assert.ok(Math.abs(s.position-expected.position)<1e-8);assert.ok(Math.abs(s.velocity-expected.velocity)<1e-8);}
  assert.ok(expected.velocity<1,'motion settles without a perpetual frame loop');
});
test('fast releases stay in bounds and bounce inward with less energy',()=>{
  for(const [p,v] of [[9,-1200],[199,1200]]){
    const s=glide(p,v,.04,8,200);
    assert.ok(s.position>=8&&s.position<=200);
    assert.ok(s.velocity*v<0);assert.ok(Math.abs(s.velocity)<Math.abs(v));
  }
});
test('stalled frames and negative elapsed time cannot create jumps',()=>{
  assert.deepEqual(glide(100,600,4,8,500),glide(100,600,.04,8,500));
  assert.deepEqual(glide(100,600,-1,8,500),{position:100,velocity:600});
});
