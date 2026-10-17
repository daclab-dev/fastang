import { REQUEST_CONTEXT, inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import type { RenderContext } from '@fastang/core';
import { languageOf, type Language } from '../i18n/i18n';
import { guideNavigation } from './navigation';
import type { Article } from './markdown';

export interface GuideData { slug: string; language: Language; article: Article | null }
export const guideResolver: ResolveFn<GuideData> = async (route, state) => {
  const context = inject(REQUEST_CONTEXT) as RenderContext | null;
  const slug = route.paramMap.get('slug') ?? '';
  const language = languageOf(state.url);
  if (!guideNavigation.some(guide => guide.slug === slug)) {
    if (context) context.status = 404;
    return { slug, language, article: null };
  }
  const { article } = await import('./content');
  return { slug, language, article: article(slug, language) };
};
export const guideTitle: ResolveFn<string> = (route, state) => {
  const guide = guideNavigation.find(guide => guide.slug === route.paramMap.get('slug'));
  const language = languageOf(state.url);
  return `${guide?.[language] ?? (language === 'it' ? 'Guida non trovata' : 'Guide not found')} | FastAng`;
};
