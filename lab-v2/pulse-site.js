import { createLiquidGlass } from './liquid-glass.js';
import { draggableLens, tiltCard, themeControl } from './pulse-interactions.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const stage = $('#pulse-stage');
const dialog = $('#activity-dialog');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const abort = new AbortController();
const on = (element, event, callback) => element.addEventListener(event, callback, { signal: abort.signal });
themeControl({ button: $('#pulse-theme'), signal: abort.signal });
// All surfaces share Liquid / 02's unmodified engine and material, at strength 50.
const surfaces = new Map($$('[data-glass]').map(element => [element, createLiquidGlass(element, { strength: 50, radius: Number(element.dataset.glass) })]));
const animations = new Set();
const lights = new Map();
let lightFrame = 0;
let mode = 'explore', paused = false, visible = true, confirmed = false, selected = '', dialogAction = null;
let lensMotion = null, cardTilt = null;
const active = () => !paused && !reduced.matches && !document.hidden;

function spring(element, amount = .04) {
  if (!active()) return;
  for (const animation of animations) if (animation.effect?.target === element) animation.cancel();
  const animation = element.animate([{ scale: `${1 + amount} ${1 - amount}` }, { scale: `${1 - amount * .35} ${1 + amount * .35}`, offset: .65 }, { scale: '1 1' }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
  animations.add(animation);
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
}

function updateMotion() {
  document.body.classList.toggle('motion-off', !active());
  stage.classList.toggle('flowing', active() && visible);
  $('#motion').textContent = reduced.matches ? '已减少动效' : paused ? '播放动效' : '暂停动效';
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').disabled = reduced.matches;
  $('#lens-instructions').textContent = reduced.matches ? '已遵循系统减少动态效果设置。仍可拖动、切换形状与操作所有功能。' : paused ? '动效已暂停。仍可拖动透镜、切换形状与体验交互。' : '拖动后松手，感受惯性与回弹。聚焦透镜后，也可用方向键移动。';
  if (!active()) { for (const animation of animations) animation.cancel(); lensMotion?.stop(); cardTilt?.reset(); cancelAnimationFrame(lightFrame); lightFrame = 0; lights.clear(); }
  if (!visible) lensMotion?.stop();
}
on($('#motion'), 'click', () => { paused = !paused; updateMotion(); });
on(document, 'visibilitychange', updateMotion);
on(reduced, 'change', updateMotion);
const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateMotion(); });
observer.observe(stage);
updateMotion();

const story = {
  explore: { kicker: 'PULSE / LIGHT & PLAY', title: ['让心意，', '轻盈地流动。'], copy: '拖动一片光，换一种形状。\n从轻轻触碰开始，遇见不一样的日常。' },
  poll: { kicker: '周末灵感局 / VOL. 01', title: ['好时光，', '由我们决定。'], copy: '山野的风，海边的晚霞，或是街角的咖啡。\n这一站，听听大家的心意。' },
  draw: { kicker: '日常好运局 / VOL. 02', title: ['小惊喜，', '让偶然发生。'], copy: '给忙碌按下暂停，把期待交给未知。\n或许，下一份好运正朝你走来。' },
};
function setMode(next, focusTab = false) {
  if (!story[next]) return;
  lensMotion?.cancel();
  mode = next;
  for (const name of ['explore', 'poll', 'draw']) {
    const current = name === mode, tab = $(`#${name}-tab`);
    tab.setAttribute('aria-selected', String(current));
    tab.tabIndex = current ? 0 : -1;
    $(`#${name}-panel`).hidden = !current;
  }
  $('.pulse-nav').dataset.active = mode;
  stage.dataset.view = mode;
  $('#story-kicker').textContent = story[mode].kicker;
  $('#story-title').replaceChildren(document.createTextNode(story[mode].title[0]), document.createElement('br'), document.createTextNode(story[mode].title[1]));
  $('#story-copy').replaceChildren(document.createTextNode(story[mode].copy.split('\n')[0]), document.createElement('br'), document.createTextNode(story[mode].copy.split('\n')[1]));
  spring($('.nav-indicator'), .1);
  if (focusTab) $(`#${mode}-tab`).focus({ preventScroll: true });
}
for (const name of ['explore', 'poll', 'draw']) on($(`#${name}-tab`), 'click', () => setMode(name));
on($('.pulse-nav'), 'keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const names = ['explore', 'poll', 'draw'], direction = event.key === 'ArrowLeft' ? -1 : 1;
  setMode(event.key === 'Home' ? 'explore' : event.key === 'End' ? 'draw' : names[(names.indexOf(mode) + direction + names.length) % names.length], true);
});
for (const button of $$('[data-go]')) on(button, 'click', () => {
  setMode(button.dataset.go, true);
  stage.scrollIntoView({ behavior: active() ? 'smooth' : 'instant', block: 'start' });
});

for (const button of $$('.scenes button')) on(button, 'click', () => {
  stage.dataset.palette = button.dataset.palette;
  document.body.dataset.palette = button.dataset.palette;
  for (const item of $$('.scenes button')) item.setAttribute('aria-pressed', String(item === button));
  $('#scene-name').textContent = { aurora: '01 / AURORA', dune: '02 / DUNE', blueprint: '03 / BLUEPRINT' }[button.dataset.palette];
});

for (const element of $$('[data-glass]')) {
  on(element, 'pointermove', event => {
    if (!active()) return;
    lights.set(element, { x: event.clientX, y: event.clientY });
    if (lightFrame) return;
    lightFrame = requestAnimationFrame(() => {
      lightFrame = 0;
      const updates = [...lights].map(([surface, point]) => ({ surface, point, rect: surface.getBoundingClientRect() }));
      for (const { surface, point, rect } of updates) {
        if (!rect.width || !rect.height) continue;
        surface.style.setProperty('--light-x', `${Math.max(0, Math.min(100, (point.x - rect.left) / rect.width * 100))}%`);
        surface.style.setProperty('--light-y', `${Math.max(0, Math.min(100, (point.y - rect.top) / rect.height * 100))}%`);
      }
      lights.clear();
    });
  });
  on(element, 'pointerleave', () => {
    lights.delete(element);
    element.style.removeProperty('--light-x'); element.style.removeProperty('--light-y');
  });
}

lensMotion = draggableLens({ element: $('#lens'), scene: stage, canAnimate: () => active() && visible, bounce: spring, signal: abort.signal });
cardTilt = tiltCard({ element: $('#prize'), canAnimate: active, signal: abort.signal });
for (const button of $$('.shapes button')) on(button, 'click', () => {
  if (mode !== 'explore') setMode('explore');
  lensMotion.cancel();
  const shape = button.dataset.shape;
  $('#lens').dataset.shape = shape;
  surfaces.get($('#lens')).setRadius(shape === 'circle' ? 999 : shape === 'pill' ? 90 : 66);
  for (const item of $$('.shapes button')) item.setAttribute('aria-pressed', String(item === button));
  spring($('#lens'), .045);
});
on($('#reset-lens'), 'click', () => { if (mode !== 'explore') setMode('explore'); lensMotion.home(); spring($('#lens')); });
on($('#island-toggle'), 'click', () => {
  const open = $('#island').classList.toggle('expanded');
  $('#island-toggle').setAttribute('aria-expanded', String(open));
  $('#island-label').textContent = open ? '让心意展开' : '你的心动清单';
  $('#island-content').inert = !open;
});

function showDialog({ kicker, title, description, detail, action, callback }) {
  $('#dialog-kicker').textContent = kicker;
  $('#dialog-title').textContent = title;
  $('#dialog-description').textContent = description;
  $('#dialog-detail').textContent = detail;
  $('#dialog-action').textContent = action;
  dialogAction = callback || (() => dialog.close());
  stage.scrollIntoView({ block: 'center', behavior: 'instant' });
  dialog.showModal();
  spring($('.dialog-symbol'), .12);
}
on($('.dialog-close'), 'click', () => dialog.close());
on($('#dialog-action'), 'click', () => dialogAction?.());
on(dialog, 'close', () => { dialogAction = null; });
// Native dialog supplies Escape dismissal, focus trapping and focus restoration.
let backdropStart = false;
on(dialog, 'pointerdown', event => { backdropStart = event.target === dialog; });
on(dialog, 'click', event => { if (backdropStart && event.target === dialog) dialog.close(); backdropStart = false; });

function showRules() {
  showDialog({ kicker: 'A FEW LITTLE NOTES', title: '轻松参与，尽兴而归。', description: mode === 'explore' ? '拖动玻璃再松手，感受回弹；试试不同形状，或向下探索倾斜卡片与展开胶囊。' : mode === 'poll' ? '选择你喜欢的目的地，确认后就能点亮这一票。' : '轻触抽签按钮，揭开一份属于今天的小灵感。', detail: '这是 PULSE 的独立视觉体验。\n所有选项和结果都是示例，不会提交到真实活动。\n无需登录，刷新页面即可重新开始。', action: '知道了，开始体验 ↗' });
}
on($('.help-button'), 'click', showRules);
on($('#about-activity'), 'click', showRules);
on($('#poll-form'), 'change', () => {
  selected = new FormData($('#poll-form')).get('destination') || '';
  $('#vote-button').disabled = !selected;
});
on($('#poll-form'), 'submit', event => {
  event.preventDefault();
  if (!selected || confirmed) return;
  showDialog({ kicker: 'A CHOICE THAT FEELS RIGHT', title: `这一票，给${selected}。`, description: '跟着此刻的心意，选一个值得期待的周末。', detail: `你的选择 · ${selected}\n体验投票，仅在当前页面显示。`, action: '确认我的选择 ↗', callback: () => {
    if (confirmed) return;
    confirmed = true;
    $('#chosen-destination').textContent = selected;
    $('#poll-form-state').hidden = true;
    $('#poll-result').hidden = false;
    dialog.close();
    $('#reset-poll').focus({ preventScroll: true });
    $('#announcement').textContent = `体验投票完成，你选择了${selected}。`;
    spring($('.result-symbol'), .12);
  } });
});
on($('#reset-poll'), 'click', () => {
  confirmed = false; selected = '';
  $('#poll-form').reset(); $('#vote-button').disabled = true;
  $('#poll-result').hidden = true; $('#poll-form-state').hidden = false;
  $('#poll-form input').focus({ preventScroll: true });
  $('#announcement').textContent = '已重置，可以重新选择。';
});
const fortunes = [
  { title: '把今天，过成小假期。', copy: '给自己一杯喜欢的饮料，和一段不用赶路的时间。', detail: '今日灵感 / 01\n留一点空白，好事才有地方发生。' },
  { title: '下一站，遇见好心情。', copy: '换一条回家的路，或许会遇见一片从没留意过的晚霞。', detail: '今日灵感 / 02\n让小小的冒险，带来新的视角。' },
  { title: '你值得，一点小奖励。', copy: '把一直想做的小事提上日程，今天就给自己一个开始。', detail: '今日灵感 / 03\n每一个认真生活的日子，都值得被庆祝。' },
  { title: '有人，和你心意相通。', copy: '给想念的人发句问候，一次小小的主动，也能点亮一天。', detail: '今日灵感 / 04\n连接不必隆重，真诚就足够。' },
];
function revealFortune() {
  const item = fortunes[crypto.getRandomValues(new Uint32Array(1))[0] % fortunes.length];
  showDialog({ kicker: 'A LITTLE LUCK, JUST FOR YOU', title: item.title, description: item.copy, detail: item.detail, action: '收下这份小幸运 ✳' });
}
on($('#draw-button'), 'click', revealFortune);
on($('#prize'), 'click', revealFortune);

on(window, 'pagehide', event => {
  if (event.persisted) return;
  abort.abort(); observer.disconnect();
  cancelAnimationFrame(lightFrame); lights.clear();
  lensMotion.destroy(); cardTilt.destroy();
  for (const animation of animations) animation.cancel();
  for (const surface of surfaces.values()) surface.destroy();
});
