import { parseMarkdown } from './markdown';
import type { Language } from '../i18n/i18n';

const sources = import.meta.glob('../../../docs/guide/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export function article(slug: string, language: Language) {
  const source = sources[`../../../docs/guide/${language}/${slug}.md`];
  if (!source) throw new Error(`Missing guide: ${language}/${slug}`);
  return parseMarkdown(source);
}
