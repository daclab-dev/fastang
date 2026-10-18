import { Component, inject, input } from '@angular/core';
import DocumentationArticle from './docs/[slug].page';
import DocumentationLayout from './docs/layout';
import DocumentationIndex from './docs/index.page';
import { DocumentationContext } from '../docs/context';
import type { GuideData } from '../docs/resolver';

@Component({
  imports: [DocumentationArticle, DocumentationIndex, DocumentationLayout],
  template: `<fastang-doc-layout>@if (docs.location().slug) {<fastang-doc-article [guide]="guide()" />} @else {<fastang-doc-index />}</fastang-doc-layout>`,
})
export default class VersionedDocumentation {
  readonly docs = inject(DocumentationContext);
  readonly guide = input.required<GuideData>();
}
