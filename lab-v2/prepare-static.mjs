import { mkdir, copyFile } from 'node:fs/promises';
export const files = ['index.html', 'experience.js', 'visual.css', 'motion.js', 'liquid-glass.js', 'liquid-glass.css', 'optics.js', 'THIRD-PARTY-LICENSE.txt', 'pulse.html', 'pulse-site.css', 'pulse-polish.css', 'pulse-site.js', 'pulse-interactions.js', 'spring-disclosure.js', 'spring-disclosure.css', 'pulse-glass.js', 'pulse-glass.css', 'pulse-transitions.js', 'pulse-transitions.css'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
console.log(`Prepared ${files.length} public assets. Tests, evidence and local server are excluded.`);
