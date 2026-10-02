import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const page of ['index.html', 'pulse.html']) {
  test(`${page}: material loading never hides or fades the entire document`, () => {
    const html = readFileSync(new URL(page, import.meta.url), 'utf8');
    const css = readFileSync(new URL('liquid-glass.css', import.meta.url), 'utf8');
    assert.doesNotMatch(html, /glass-booting|glass-entering|glass-ready/);
    assert.doesNotMatch(css, /body\s*\{[^}]*(?:visibility|opacity|animation)/);
    assert.match(html, /rel="modulepreload"/);
  });
}
