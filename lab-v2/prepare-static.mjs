import { mkdir, copyFile } from 'node:fs/promises';
export const files = ['index.html', 'experience.js', 'visual.css', 'motion.js', 'liquid-glass.js', 'liquid-glass.css', 'optics.js', 'THIRD-PARTY-LICENSE.txt', 'pulse.html', 'pulse-site.css', 'pulse-site.js', 'pulse-interactions.js'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
console.log(`Prepared ${files.length} public assets. Tests, evidence and local server are excluded.`);
