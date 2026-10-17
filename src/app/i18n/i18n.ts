import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Pipe, inject, signal, type PipeTransform } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, TitleStrategy, type UrlTree, type RouterStateSnapshot } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { english } from './en';

export type Language = 'it' | 'en';
export const SITE_ORIGIN = 'https://fastang.dev';
export function languageOf(url: string): Language {
  return /^\/en(?:\/|[?#]|$)/.test(url) ? 'en' : 'it';
}
/** Only the locale prefix changes; path, query and fragment are preserved. */
export function localizedPath(url: string, language: Language): string {
  const [, pathname, suffix] = /^([^?#]*)(.*)$/.exec(url)!;
  const source = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const path = source.startsWith('/') ? source : '/' + source;
  return (language === 'en' ? '/en' + (path === '/' ? '' : path) : path) + suffix;
}

@Injectable({ providedIn: 'root' })
export class SiteLanguage {
  private router!: Router;
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly current = signal<Language>(languageOf(this.document.location?.pathname ?? '/'));
  readonly url = signal('/');

  connect(router: Router): void {
    this.router = router;
    const subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationStart || event instanceof NavigationEnd) {
        const url = event instanceof NavigationEnd ? event.urlAfterRedirects : event.url;
        this.url.set(url);
        this.current.set(languageOf(url));
      }
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
  text(value: string): string { return this.current() === 'en' ? english[value] ?? value : value; }
  path(value: string): string { return localizedPath(value, this.current()); }
  switchTo(language: Language): UrlTree { return this.router.parseUrl(localizedPath(this.url(), language)); }
}

// Impure pipes read the locale signal, so reused layout components update too.
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly language = inject(SiteLanguage);
  transform(value: string): string { return this.language.text(value); }
}
@Pipe({ name: 'localePath', pure: false })
export class LocalePathPipe implements PipeTransform {
  private readonly language = inject(SiteLanguage);
  transform(value: string): string { return this.language.path(value); }
}

@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly language = inject(SiteLanguage);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const language = languageOf(snapshot.url);
    this.language.current.set(language);
    this.language.url.set(snapshot.url);
    this.document.documentElement.lang = language;
    this.title.setTitle(this.language.text(this.buildTitle(snapshot) ?? 'FastAng — Angular + Fastify'));
    this.meta.updateTag({ name: 'description', content: this.language.text('Solidità Angular. Energia Fastify. Un framework fullstack con rendering Angular e API Fastify.') });
    // Public origin is explicit: never derive canonical URLs from an incoming Host header.
    const path = snapshot.url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    this.link('canonical', SITE_ORIGIN + path);
    this.link('alternate', SITE_ORIGIN + localizedPath(path, 'it'), 'it');
    this.link('alternate', SITE_ORIGIN + localizedPath(path, 'en'), 'en');
    this.link('alternate', SITE_ORIGIN + localizedPath(path, 'it'), 'x-default');
  }
  private link(rel: string, href: string, language?: string): void {
    const selector = `link[rel="${rel}"]${language ? `[hreflang="${language}"]` : ''}`;
    let link = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      if (language) link.hreflang = language;
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}
