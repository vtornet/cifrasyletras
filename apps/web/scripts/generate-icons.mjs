// Requiere sharp como dependencia temporal: pnpm add -D sharp && node scripts/generate-icons.mjs && pnpm remove sharp
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');
const source = join(iconsDir, 'icon-source.svg');

mkdirSync(iconsDir, { recursive: true });

const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <g transform="translate(56 56) scale(0.78)">
    <rect x="150" y="180" width="160" height="160" rx="28" fill="#ffffff" opacity="0.4" transform="rotate(-12 230 260)" />
    <rect x="202" y="180" width="160" height="160" rx="28" fill="#ffffff" transform="rotate(8 282 260)" />
  </g>
</svg>
`;

const targets = [
  { file: 'icon-192.png', size: 192, input: source },
  { file: 'icon-512.png', size: 512, input: source },
  { file: 'icon-maskable-512.png', size: 512, input: Buffer.from(maskableSvg) },
];

for (const target of targets) {
  await sharp(target.input, { density: 384 })
    .resize(target.size, target.size)
    .png()
    .toFile(join(iconsDir, target.file));
  console.log(`generated ${target.file}`);
}
