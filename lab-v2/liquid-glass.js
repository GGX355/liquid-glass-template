// Based on the Canvas → SVG displacement technique demonstrated by
// https://github.com/shuding/liquid-glass . See THIRD-PARTY-LICENSE.txt.
import { displacement } from './optics.js';
const NS = 'http://www.w3.org/2000/svg';
const make = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
export function createLiquidGlass(element, { strength = 45, radius = 40 } = {}) {
  if (!(element instanceof HTMLElement)) throw new TypeError('Expected HTMLElement');
  const id = `lg-${crypto.randomUUID()}`;
  const svg = make('svg', { width: 0, height: 0, 'aria-hidden': true });
  svg.style.cssText = 'position:fixed;pointer-events:none;overflow:hidden';
  const filter = make('filter', { id, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB', x: 0, y: 0 });
  const map = make('feImage', { result: 'map', preserveAspectRatio: 'none' });
  const warp = make('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', scale: strength * 2 });
  filter.append(map, warp); svg.append(filter); document.body.append(svg);
  const oldFilter = element.style.getPropertyValue('--liquid-filter');
  element.style.setProperty('--liquid-filter', `url(#${id})`);
  element.classList.add('liquid-surface');
  let timer = 0, destroyed = false, lastSize = '';
  const oldRadius = element.style.getPropertyValue('--radius');
  element.style.setProperty('--radius', `${radius}px`);
  const render = () => {
    if (destroyed) return;
    const width = element.offsetWidth, height = element.offsetHeight;
    if (!width || !height) return;
    const key = `${width}:${height}:${radius}`;
    if (key === lastSize) return;
    lastSize = key;
    // Bound map size; dragging reuses the same map without per-frame encoding.
    const ratio = Math.min(1, 600 / Math.max(width, height), Math.sqrt(120000 / (width * height)));
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [dx, dy] = displacement(x / ratio, y / ratio, width, height, radius);
      const i = (y * w + x) * 4;
      data.data[i] = Math.round(127.5 + dx * 127.5);
      data.data[i + 1] = Math.round(127.5 + dy * 127.5);
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    filter.setAttribute('width', width); filter.setAttribute('height', height);
    map.setAttribute('width', width); map.setAttribute('height', height);
    map.setAttribute('href', canvas.toDataURL());
  };
  const observer = new ResizeObserver(() => {
    // Stretch the cached map during morphs; regenerate once dimensions settle.
    const width = element.offsetWidth, height = element.offsetHeight;
    for (const node of [filter, map]) { node.setAttribute('width', width); node.setAttribute('height', height); }
    clearTimeout(timer); timer = setTimeout(render, 100);
  });
  observer.observe(element); render();
  return {
    setStrength(value) { strength = Math.max(0, Math.min(90, Number(value) || 0)); warp.setAttribute('scale', strength * 2); },
    setRadius(value) {
      radius = Math.max(0, Math.min(999, Number(value) || 0));
      element.style.setProperty('--radius', `${radius}px`);
      clearTimeout(timer); timer = setTimeout(render, 520);
    },
    destroy() {
      destroyed = true; observer.disconnect(); clearTimeout(timer); svg.remove();
      element.classList.remove('liquid-surface');
      if (oldRadius) element.style.setProperty('--radius', oldRadius);
      else element.style.removeProperty('--radius');
      if (oldFilter) element.style.setProperty('--liquid-filter', oldFilter);
      else element.style.removeProperty('--liquid-filter');
    },
  };
}
