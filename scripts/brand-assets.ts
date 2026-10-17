import sharp from 'sharp';
import { resolve } from 'node:path';

// Esportazioni tecniche dal master ImageGen: nessuna modifica al disegno originale.
const directory = resolve('src/assets/brand');
const master = resolve(directory, 'fastang-shield.png');
for (const size of [96, 440, 880]) {
  const target = resolve(directory, `fastang-shield-${size}.webp`);
  await sharp(master).resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(target);
  console.log(`Brand asset: ${target}`);
}
await sharp(master).resize(64, 64).png({ compressionLevel: 9 }).toFile(resolve(directory, 'fastang-favicon-64.png'));
