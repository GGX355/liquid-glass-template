import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displacement} from './optics.js';
test('center stays neutral and rounded exterior stays neutral',()=>{
  assert.deepEqual(displacement(150,100,300,200,60),[0,0]);
  assert.deepEqual(displacement(0,0,300,200,60),[0,0]);
});
test('opposite rims bend symmetrically toward the interior',()=>{
  const a=displacement(3,100,300,200,60),b=displacement(297,100,300,200,60);
  assert.ok(a[0]>.8);assert.equal(a[0],-b[0]);assert.equal(Math.abs(a[1]),0);
});
test('small and large shapes always produce bounded finite maps',()=>{
  for(const [w,h] of [[12,8],[300,200],[1800,600]])
    for(let y=0;y<=h;y+=h/20)for(let x=0;x<=w;x+=w/20)
      for(const value of displacement(x,y,w,h,64))assert.ok(Number.isFinite(value)&&Math.abs(value)<=1);
});
