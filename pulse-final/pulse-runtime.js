import { configurePulseGlass } from './pulse-glass.js';
import { draggableLens, tiltCard, themeControl } from './pulse-interactions.js';
import { springDisclosure } from './spring-disclosure.js';
import { panelTransitions, dialogTransitions } from './pulse-transitions.js';
import { elasticFeedback, labNavigation } from './pulse-motion.js';
import { pointerLight } from './pointer-light.js';

import { bindPulseBusiness } from './pulse-business.js';
export function mountPulse({ business = null, embedded = false } = {}) {
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const stage = $('#pulse-stage');
const dialog = $('#activity-dialog');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const abort = new AbortController();
const on = (element, event, callback) => element.addEventListener(event, callback, { signal: abort.signal });
themeControl({ button: $('#pulse-theme'), signal: abort.signal });
// Keep the optical engine; tune displacement to the scale of each control.
const glass = configurePulseGlass({ signal: abort.signal });
const { surfaces } = glass;
let mode = 'explore', paused = false, visible = true, confirmed = false, selected = '', dialogAction = null;
let lensMotion = null, cardTilt = null, islandMotion = null, businessView = null;
const active = () => !paused && !reduced.matches && !document.hidden;
const lights = pointerLight({ elements: $$('[data-glass]'), canAnimate: active, signal: abort.signal });
const modalMotion = dialogTransitions({ dialog, canAnimate: active, signal: abort.signal,
  prepare: async () => {
    await surfaces.get($('.dialog-glass')).refresh();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
});
const feedback = elasticFeedback({ canAnimate: active });
const navigations = $$('.pulse-nav, #flow-nav').map(rail => labNavigation({ rail, canAnimate: active, count: embedded && rail.matches('.pulse-nav') ? 2 : 3 }));
function selectNavigation(next) {
  for (const [index, navigation] of navigations.entries()) navigation.select((embedded && index === 0 ? ['poll', 'draw'] : ['explore', 'poll', 'draw']).indexOf(next));
  for (const button of $$('[data-nav-mode]')) button.setAttribute('aria-pressed', String(button.dataset.navMode === next));
  $('#flow-caption').textContent = { explore: '发现 · 好点子，从这里开始。', poll: '投票 · 让每一个选择被看见。', draw: '抽签 · 给日常一点随机的惊喜。' }[next];
}
const spring = (element, amount) => feedback.pulse(element, amount);

function updateMotion() {
  document.body.classList.toggle('motion-off', !active());
  stage.classList.toggle('flowing', active() && visible);
  $('#motion').textContent = reduced.matches ? '已减少动效' : paused ? '播放动效' : '暂停动效';
  $('#motion').setAttribute('aria-pressed', String(paused));
  $('#motion').disabled = reduced.matches;
  $('#lens-instructions').textContent = reduced.matches ? '已遵循系统减少动态效果设置。仍可拖动、切换形状与操作所有功能。' : paused ? '动效已暂停。仍可拖动透镜、切换形状与体验交互。' : '拖动后松手，感受惯性与回弹。聚焦透镜后，也可用方向键移动。';
  if (!active()) { lensMotion?.stop(); cardTilt?.reset(); lights.clear(); }
  if (!visible) lensMotion?.stop();
  islandMotion?.syncMotion();
  modalMotion.syncMotion();
  for (const navigation of navigations) navigation.syncMotion();
  if (!active()) feedback.stop();
}
on($('#motion'), 'click', () => { paused = !paused; updateMotion(); });
on(document, 'visibilitychange', updateMotion);
on(reduced, 'change', updateMotion);
const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateMotion(); });
observer.observe(stage);
updateMotion();

const modes = embedded ? ['poll', 'draw'] : ['explore', 'poll', 'draw'];
const panels = panelTransitions({ stage });
function setMode(next, focusTab = false) {
  if (!modes.includes(next)) return;
  if (next === mode) { selectNavigation(mode); if (focusTab) $(`#${mode}-tab`).focus({ preventScroll: true }); return; }
  lensMotion?.cancel();
  mode = next;
  for (const name of ['explore', 'poll', 'draw']) {
    const current = name === mode, tab = $(`#${name}-tab`);
    tab.setAttribute('aria-selected', String(current));
    tab.tabIndex = current ? 0 : -1;
  }
  $('.pulse-nav').dataset.active = mode;
  stage.dataset.view = mode;
  panels.setMode(mode);
  if (embedded && mode !== 'explore') {
    const featurePanel = $('#poll-panel');
    featurePanel.inert = false; featurePanel.setAttribute('aria-hidden', 'false');
    featurePanel.setAttribute('aria-labelledby', `${mode}-tab`);
  }
  selectNavigation(mode);
  if (focusTab) $(`#${mode}-tab`).focus({ preventScroll: true });
}
for (const name of ['explore', 'poll', 'draw']) on($(`#${name}-tab`), 'click', () => setMode(name));
for (const button of $$('[data-nav-mode]')) on(button, 'click', () => setMode(button.dataset.navMode));
on($('.pulse-nav'), 'keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const names = modes, direction = event.key === 'ArrowLeft' ? -1 : 1;
  setMode(event.key === 'Home' ? names[0] : event.key === 'End' ? names.at(-1) : names[(names.indexOf(mode) + direction + names.length) % names.length], true);
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
islandMotion = springDisclosure({
  element: $('#island'), toggle: $('#island-toggle'), content: $('#island-content'),
  canAnimate: active, signal: abort.signal,
  onChange: open => { $('#island-label').textContent = open ? '让心意展开' : '你的心动清单'; },
});

function showDialog({ kicker, title, description, detail, action, callback, content }) {
  $('#dialog-kicker').textContent = kicker;
  $('#dialog-title').textContent = title;
  $('#dialog-description').textContent = description;
  $('#dialog-detail').textContent = detail || '';
  if (content) $('#dialog-detail').append(content);
  const oldError = dialog.querySelector('.business-error'); oldError?.remove();
  $('#dialog-action').disabled = false;
  $('#dialog-action').hidden = !action;
  glass.refresh(); lights.refresh($$('[data-glass]'));
  $('#dialog-action').textContent = action;
  dialogAction = callback || (() => modalMotion.close());
  modalMotion.open();
  const sceneBounds = stage.getBoundingClientRect(), modalBounds = dialog.getBoundingClientRect();
  dialog.dataset.surround = sceneBounds.top <= modalBounds.top && sceneBounds.bottom >= modalBounds.bottom ? 'scene' : 'page';
  spring($('.dialog-symbol'), .12);
}
on($('.dialog-close'), 'click', () => modalMotion.close());
on($('#dialog-action'), 'click', async () => {
  const button = $('#dialog-action');
  if (button.disabled) return;
  button.disabled = true;
  dialog.querySelector('.business-error')?.remove();
  try { await dialogAction?.(); }
  catch (error) { const message = document.createElement('p'); message.className = 'business-error'; message.role = 'alert'; message.textContent = error.message || '操作失败，请重试'; button.before(message); }
  finally { button.disabled = false; }
});
on(dialog, 'close', () => { dialogAction = null; });
// Native dialog supplies Escape dismissal, focus trapping and focus restoration.
let backdropStart = false;
on(dialog, 'pointerdown', event => { backdropStart = event.target === dialog; });
on(dialog, 'click', event => { if (backdropStart && event.target === dialog) modalMotion.close(); backdropStart = false; });

function showRules() {
  showDialog({ kicker: 'A FEW LITTLE NOTES', title: '轻松参与，尽兴而归。', description: mode === 'explore' ? '拖动玻璃再松手，感受回弹；试试不同形状，或向下探索倾斜卡片与展开胶囊。' : mode === 'poll' ? '选择你喜欢的目的地，确认后就能点亮这一票。' : '轻触抽签按钮，揭开一份属于今天的小灵感。', detail: business && !business.demo ? '每人只能参与一次。\n截止后不能继续提交，领取后的抽签结果会保留。\n发起和管理活动需要登录。' : '所有选项和结果都是示例，不会提交到真实活动。\n无需登录，刷新页面即可重新开始。', action: '知道了，开始体验 ↗' });
}
on($('.help-button'), 'click', showRules);
on($('#about-activity'), 'click', showRules);
if (business) businessView = bindPulseBusiness({ api: business, showDialog, modalMotion, panels, setMode, signal: abort.signal, refreshGlass: () => { glass.refresh(); lights.refresh($$('[data-glass]')); } });
if (!business && !embedded) {
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
    modalMotion.close(() => {
      panels.setResult(true);
      $('#announcement').textContent = `体验投票完成，你选择了${selected}。`;
      spring($('.result-symbol'), .12);
    });
  } });
});
on($('#reset-poll'), 'click', () => {
  confirmed = false; selected = '';
  $('#poll-form').reset(); $('#vote-button').disabled = true;
  panels.setResult(false);
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
}
// The lab's card responds where it was touched. A modal broke that physical
// connection; the main draw activity still offers the full fortune dialog.
on($('#prize'), 'click', () => {
  const card = $('#prize'), revealed = card.classList.toggle('revealed');
  card.setAttribute('aria-pressed', String(revealed));
  card.querySelector('strong').textContent = revealed ? '今天，灵感满格。' : '向好运，靠近一点。';
  card.querySelector('.prize-tip').textContent = revealed ? '留一点空白，让好事发生。↗' : '接住今天的小惊喜 ↗';
  $('#announcement').textContent = revealed ? '今天，灵感满格。留一点空白，让好事发生。' : '好运卡片已收起。';
  spring(card, .09);
});

function destroy() {
  abort.abort(); observer.disconnect();
  lensMotion.destroy(); cardTilt.destroy(); islandMotion.destroy(); modalMotion.destroy();
  for (const navigation of navigations) navigation.destroy();
  feedback.stop(); glass.destroy(); businessView?.destroy();
}
on(window, 'pagehide', event => { if (!event.persisted) destroy(); });
return { destroy, setMode, refreshGlass: () => { glass.refresh(); lights.refresh($$('[data-glass]')); } };
}
