import { REQUEST_CONTEXT, inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import type { RenderContext } from '@fastang/core';
import { languageOf, type Language } from '../i18n/i18n';
import { CURRENT_DOCS_VERSION, documentationLocation } from './versions';
import type { Article } from './markdown';

export interface GuideData { slug: string; version: string; language: Language; article: Article | null }
export const guideResolver: ResolveFn<GuideData> = async (route, state) => {
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  const slug = route.paramMap.get('slug') ?? '';
  const language = languageOf(state.url);
  const version = documentationLocation(state.url).version;
  if (!version?.guides.some(guide => guide.slug === slug)) {
    if (context) context.status = 404;
    return { slug, version: version?.version ?? '', language, article: null };
  }
  const { article } = await import('./content');
  return { slug, version: version.version, language, article: await article(slug, language, version.version, version.version === CURRENT_DOCS_VERSION) };
};
export const guideTitle: ResolveFn<string> = (route, state) => {
  const version = documentationLocation(state.url).version;
  const guide = version?.guides.find(guide => guide.slug === route.paramMap.get('slug'));
  const language = languageOf(state.url);
  return `${guide?.[language] ?? (language === 'it' ? 'Guida non trovata' : 'Guide not found')} | FastAng`;
};

export const docsIndexResolver: ResolveFn<boolean> = (_route, state) => {
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  const valid = !!documentationLocation(state.url).version;
  if (!valid && context) context.status = 404;
  return valid;
};
