import { Injectable, computed, inject } from '@angular/core';
import { SiteLanguage } from '../i18n/i18n';
import { documentationLocation, documentationPath } from './versions';
@Injectable({ providedIn: 'root' })
export class DocumentationContext {
  private readonly language = inject(SiteLanguage);
  readonly location = computed(() => documentationLocation(this.language.url()));
  readonly version = computed(() => this.location().version);
  readonly guides = computed(() => this.version()?.guides ?? []);
  path(slug?: string): string { const version = this.version(); return version ? documentationPath(version, slug) : '/docs'; }
}
