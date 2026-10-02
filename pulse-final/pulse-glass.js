import { createLiquidGlass } from './liquid-glass.js';

// Project-specific SVG displacement strengths, not Apple's optical constants
// or percentages. Compact controls need less displacement than large lenses.
export const glassProfiles = {
  soft: { hero: 32, panel: 28, navigation: 22, control: 14 },
  balanced: { hero: 50, panel: 40, navigation: 22, control: 22 },
  vivid: { hero: 60, panel: 50, navigation: 22, control: 30 },
};

export function configurePulseGlass({ root = document, signal }) {
  const find = selector => [...root.querySelectorAll(selector)];
  const controls = find('button:not([role="tab"]):not(#island-toggle):not([data-nav-mode]), .poll-option, .lab-link, .footer-links > a');
  for (const element of controls) {
    if (element.id === 'prize') continue;
    if (!element.hasAttribute('data-glass')) element.dataset.glass = element.matches('.poll-option') ? '18' : element.matches('.dialog-close') ? '22' : '26';
    element.dataset.glassRole = 'control';
    element.classList.add('glass-control');
  }
  // Match Liquid / 02: only the moving pill refracts, not its stationary rail.
  // A filtered parent turned the pill into a non-refracting nested overlay.
  for (const pill of find('.nav-indicator')) {
    pill.dataset.glass = '30';
    pill.dataset.glassRole = 'navigation';
  }
  for (const element of find('.activity-card, .dialog-glass, #prize, #island')) element.dataset.glassRole = 'panel';
  root.querySelector('#lens').dataset.glassRole = 'hero';

  const storageKey = 'pulse-liquid-profile';
  let profile = 'balanced';
  try { const saved = localStorage.getItem(storageKey); if (Object.hasOwn(glassProfiles, saved)) profile = saved; } catch { /* The page works when storage is unavailable. */ }
  const elements = find('[data-glass]');
  const strengthFor = element => glassProfiles[profile][element.dataset.glassRole];
  const overlays = elements.filter(element => element.parentElement.closest('[data-glass]'));
  // Apple recommends a thin translucent overlay for controls within glass,
  // instead of refracting the same content through stacked glass filters.
  for (const element of overlays) {
    element.classList.add('liquid-surface', 'glass-overlay');
    element.style.setProperty('--radius', `${element.dataset.glass}px`);
  }
  const surfaces = new Map(elements.filter(element => !overlays.includes(element)).map(element => {
    const strength = strengthFor(element);
    element.dataset.glassStrength = String(strength);
    return [element, createLiquidGlass(element, { radius: Number(element.dataset.glass), strength })];
  }));
  function apply(next, save = true) {
    if (!Object.hasOwn(glassProfiles, next)) return;
    profile = next;
    document.body.dataset.glassProfile = profile;
    for (const [element, surface] of surfaces) {
      const strength = strengthFor(element);
      surface.setStrength(strength); element.dataset.glassStrength = String(strength);
    }
    for (const element of overlays) {
      const backing = element.parentElement.closest('[data-glass]');
      element.dataset.glassStrength = String(glassProfiles[profile][backing.dataset.glassRole]);
    }
    for (const button of find('button[data-glass-profile]')) button.setAttribute('aria-pressed', String(button.dataset.glassProfile === profile));
    if (save) try { localStorage.setItem(storageKey, profile); } catch { /* Keep the choice for this visit. */ }
  }
  for (const button of find('button[data-glass-profile]')) button.addEventListener('click', () => apply(button.dataset.glassProfile), { signal });
  apply(profile, false);
  return {
    surfaces,
    refresh() {
      for (const [element, surface] of surfaces) if (!element.isConnected) { surface.destroy(); surfaces.delete(element); }
      for (let i = overlays.length - 1; i >= 0; i--) if (!overlays[i].isConnected) overlays.splice(i, 1);
      for (const element of find('.business-content button, .business-content .glass-control, #poll-form .poll-option, .business-tools button, .pulse-business-host button, .pulse-business-host .poll-option, .pulse-route-nav a')) {
        if (!element.hasAttribute('data-glass')) element.dataset.glass = '22';
        element.dataset.glassRole = 'control'; element.classList.add('glass-control');
        if (surfaces.has(element) || overlays.includes(element)) continue;
        if (element.parentElement.closest('[data-glass]')) {
          element.classList.add('liquid-surface', 'glass-overlay');
          element.style.setProperty('--radius', `${element.dataset.glass}px`); overlays.push(element);
        } else {
          const strength = strengthFor(element); element.dataset.glassStrength = String(strength);
          surfaces.set(element, createLiquidGlass(element, { radius: Number(element.dataset.glass), strength }));
        }
      }
    },
    destroy() {
      for (const surface of surfaces.values()) surface.destroy();
      for (const element of overlays) { element.classList.remove('liquid-surface', 'glass-overlay'); element.style.removeProperty('--radius'); }
    },
  };
}
