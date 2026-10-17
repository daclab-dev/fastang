import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, LocalePathPipe, SiteLanguage } from '../../i18n/i18n';
import { inject } from '@angular/core';
import { guideNavigation } from '../../docs/navigation';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, LocalePathPipe],
  template: `
    <section class="docs-shell">
      <aside class="docs-sidebar">
        <a class="docs-heading" [routerLink]="'/docs' | localePath">{{ 'Documentazione' | t }}<span>0.1.0-alpha.0</span></a>
        <nav class="docs-navigation" [aria-label]="'Documentazione' | t">
          @for (guide of guides; track guide.slug) {
            <a [routerLink]="'/docs/' + guide.slug | localePath" routerLinkActive="active" #active="routerLinkActive" [attr.aria-current]="active.isActive ? 'page' : null">{{ guide[language.current()] }}</a>
          }
        </nav>
        <a class="docs-source" href="https://github.com/daclab-dev/fastang/tree/main/docs/guide">{{ 'Guide su GitHub ↗' | t }}</a>
      </aside>
      <div class="docs-main"><router-outlet /></div>
    </section>
  `,
})
export default class DocumentationLayout {
  readonly guides = guideNavigation;
  readonly language = inject(SiteLanguage);
}
