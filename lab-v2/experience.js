import { createLiquidGlass } from './liquid-glass.js';
import { glide } from './motion.js';
import { springDisclosure } from './spring-disclosure.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const lens = $('#lens'), scene = $('#scene'), pill = $('#nav-pill'), prize = $('#prize'), island = $('#island');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const surfaces = [createLiquidGlass(lens,{radius:66,strength:38}),createLiquidGlass(pill,{radius:30,strength:22}),createLiquidGlass(prize,{radius:38,strength:25}),createLiquidGlass(island,{radius:34,strength:24})];
const abort = new AbortController(), animations = new Set();
const on = (el,type,fn) => el.addEventListener(type,fn,{signal:abort.signal});
let paused=false, sceneVisible=true, drag=null, flight=0, highlightFrame=0;
let islandMotion = null;
const active = () => !paused && !reduced.matches && !document.hidden;
function animate(el,frames,options) {
  if(!active()) return;
  const a=el.animate(frames,options); animations.add(a);
  a.finished.catch(()=>{}).finally(()=>animations.delete(a));return a;
}
function bounce(el,amount=.06) {
  for(const a of animations)if(a.effect?.target===el)a.cancel();
  animate(el,[{scale:`${1+amount} ${1-amount}`},{scale:`${1-amount*.4} ${1+amount*.4}`,offset:.6},{scale:'1 1'}],{duration:520,easing:'cubic-bezier(.2,.75,.3,1)'});
}
function updateMotion() {
  document.body.classList.toggle('motion-off',!active());
  scene.classList.toggle('flowing',active()&&sceneVisible);
  $('#motion').textContent=paused?'播放动效':'暂停动效';$('#motion').setAttribute('aria-pressed',String(paused));
  $('#motion-note').textContent=reduced.matches?'已遵循系统减少动态效果设置':paused?'动效已暂停，仍可拖动与切换':'拖动后松手，感受惯性与回弹';
  if(!active()){cancelAnimationFrame(flight);flight=0;for(const a of animations)a.cancel();prize.style.transform='';}
  islandMotion?.syncMotion();
}
on($('#motion'),'click',()=>{paused=!paused;updateMotion();});
on(reduced,'change',updateMotion);on(document,'visibilitychange',updateMotion);
const observer=new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;updateMotion();});observer.observe(scene);updateMotion();
const bounds=()=>({maxX:Math.max(8,scene.clientWidth-lens.offsetWidth-8),maxY:Math.max(55,scene.clientHeight-lens.offsetHeight-45)});
function place(x,y){const b=bounds();lens.style.left=`${Math.max(8,Math.min(b.maxX,x))}px`;lens.style.top=`${Math.max(55,Math.min(b.maxY,y))}px`;}
on(lens,'pointerdown',e=>{
  if(e.button!==0)return;cancelAnimationFrame(flight);flight=0;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:lens.offsetLeft,top:lens.offsetTop,lastX:e.clientX,lastY:e.clientY,time:performance.now(),vx:0,vy:0};
  lens.setPointerCapture(e.pointerId);lens.focus({preventScroll:true});lens.classList.add('held');
});
on(lens,'pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const now=performance.now(),dt=Math.max(.008,(now-drag.time)/1000);
  drag.vx=Math.max(-1200,Math.min(1200,(e.clientX-drag.lastX)/dt));drag.vy=Math.max(-1200,Math.min(1200,(e.clientY-drag.lastY)/dt));
  drag.lastX=e.clientX;drag.lastY=e.clientY;drag.time=now;
  place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);
});
function release(e){
  if(!drag||drag.id!==e.pointerId)return;
  const old=drag;drag=null;lens.classList.remove('held');bounce(lens,.07);
  if(!active()||e.type!=='pointerup'||performance.now()-old.time>100)return;
  let x=lens.offsetLeft,y=lens.offsetTop,vx=old.vx,vy=old.vy,last=performance.now();
  function tick(now){
    const dt=(now-last)/1000;last=now;const b=bounds();
    const ax=glide(x,vx,dt,8,b.maxX),ay=glide(y,vy,dt,55,b.maxY);
    x=ax.position;vx=ax.velocity;y=ay.position;vy=ay.velocity;place(x,y);
    if(Math.hypot(vx,vy)>5&&active())flight=requestAnimationFrame(tick);else flight=0;
  }flight=requestAnimationFrame(tick);
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])on(lens,type,release);
on(lens,'keydown',e=>{const d={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(d){e.preventDefault();cancelAnimationFrame(flight);place(lens.offsetLeft+d[0],lens.offsetTop+d[1]);}});
on(window,'resize',()=>{cancelAnimationFrame(flight);place(lens.offsetLeft,lens.offsetTop);});
for(const el of [lens,prize,island])on(el,'pointermove',e=>{
  cancelAnimationFrame(highlightFrame);
  highlightFrame=requestAnimationFrame(()=>{
    const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.setProperty('--light-x',`${x*100}%`);el.style.setProperty('--light-y',`${y*100}%`);
    if(el===prize&&e.pointerType==='mouse'&&active())el.style.transform=`perspective(650px) rotateX(${(y-.5)*-10}deg) rotateY(${(x-.5)*10}deg)`;
  });
});
on(prize,'pointerleave',()=>{prize.style.transform='';});
for(const b of $$('.material button'))on(b,'click',()=>{
  document.body.dataset.material=b.dataset.material;for(const x of $$('.material button'))x.setAttribute('aria-pressed',String(x===b));$('#strength').disabled=b.dataset.material!=='liquid';
});
on($('#strength'),'input',e=>{const v=Number(e.target.value);$('#strength-value').value=v;surfaces.forEach((s,i)=>s.setStrength(v*(i===0?1:.62)));});
for(const b of $$('.scenes button'))on(b,'click',()=>{
  scene.dataset.palette=b.dataset.palette;for(const x of $$('.scenes button'))x.setAttribute('aria-pressed',String(x===b));
  $('#scene-name').textContent={aurora:'01 — AURORA',dune:'02 — DUNE',blueprint:'03 — BLUEPRINT'}[b.dataset.palette];
});
for(const b of $$('.shapes button'))on(b,'click',()=>{
  cancelAnimationFrame(flight);for(const x of $$('.shapes button'))x.setAttribute('aria-pressed',String(x===b));
  const shape=b.dataset.shape;lens.dataset.shape=shape;surfaces[0].setRadius(shape==='circle'?999:shape==='pill'?90:66);
  bounce(lens,.035);place(lens.offsetLeft,lens.offsetTop);
});
on(lens,'transitionend',()=>place(lens.offsetLeft,lens.offsetTop));
on($('#theme'),'click',()=>{const dark=document.body.classList.toggle('dark');$('#theme').textContent=dark?'浅色模式 ☼':'深色模式 ◐';});
const captions=['发现 · 好点子，从这里开始。','投票 · 让每一个选择被看见。','抽签 · 给日常一点随机的惊喜。'];
$$('.glass-nav button').forEach((b,i)=>on(b,'click',()=>{
  for(const x of $$('.glass-nav button'))x.removeAttribute('aria-current');b.setAttribute('aria-current','page');
  pill.style.left=`calc(7px + (100% - 14px) * ${i}/3)`;bounce(pill,.13);$('#nav-caption').textContent=captions[i];
}));
let drawn=false;
on(prize,'click',()=>{
  drawn=!drawn;bounce(prize,.09);prize.classList.toggle('revealed',drawn);
  $('#prize-title').textContent=drawn?'今天，灵感满格':'一点小惊喜';$('#prize-status').textContent=drawn?'已揭晓 · 再点一次可复位':'轻触卡片，接住今天的好运';
  const symbol=$('.prize-symbol');animate(symbol,[{rotate:'0deg',scale:'.8'},{rotate:'180deg',scale:'1.15',offset:.65},{rotate:'180deg',scale:'1'}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'});
});
islandMotion = springDisclosure({
  element:island, toggle:$('#island-toggle'), content:$('#island-content'), canAnimate:active, signal:abort.signal,
  onChange:open=>{$('#island-label').textContent=open?'收起灵感':'展开灵感';},
});
on(window,'pagehide',e=>{if(!e.persisted){abort.abort();observer.disconnect();islandMotion.destroy();cancelAnimationFrame(flight);cancelAnimationFrame(highlightFrame);for(const a of animations)a.cancel();surfaces.forEach(s=>s.destroy());}});
