import { parseMarkdown } from './markdown';
import type { Language } from '../i18n/i18n';

const archives = import.meta.glob('../../../docs/versions/*/*/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const sources = import.meta.glob('../../../docs/guide/*/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
export async function article(slug: string, language: Language, version: string, current: boolean) {
  const source = current ? sources[`../../../docs/guide/${language}/${slug}.md`] : archives[`../../../docs/versions/${version}/${language}/${slug}.md`];
  if (!source) throw new Error(`Missing guide: ${language}/${slug}`);
  return parseMarkdown(await source());
}
