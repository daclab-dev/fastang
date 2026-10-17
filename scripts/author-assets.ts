import sharp from 'sharp';
import { resolve } from 'node:path';

// Export web della foto fornita dall'autore sul proprio sito; master invariato.
const directory = resolve('src/assets/author');
await sharp(resolve(directory, 'dario-original.png'))
  .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 88, effort: 6 })
  .toFile(resolve(directory, 'dario-640.webp'));
