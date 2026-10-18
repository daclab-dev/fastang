import { guideNavigation } from './navigation';
import { archivedDocumentation } from './archives';
export interface DocumentationVersion {
  version: string;
  slug: string;
  ref: string;
  guides: readonly { slug: string; it: string; en: string }[];
}
export const CURRENT_DOCS_VERSION = '0.1.0-alpha.4';
export const documentationVersions: readonly DocumentationVersion[] = [
  { version: CURRENT_DOCS_VERSION, slug: CURRENT_DOCS_VERSION.replaceAll('.', '-'), ref: 'main', guides: guideNavigation },
  ...archivedDocumentation,
];
export function documentationLocation(url: string): { version?: DocumentationVersion; slug?: string; requested?: string } {
  const path = url.split(/[?#]/)[0].replace(/^\/en(?=\/|$)/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts[1] === 'v') return { requested: parts[2], version: parts.length <= 4 ? documentationVersions.find(version => version.slug === parts[2]) : undefined, slug: parts[3] };
  return { version: documentationVersions[0], slug: parts[1] };
}
export function documentationPath(version: DocumentationVersion, slug?: string): string {
  return `/docs/v/${version.slug}${slug ? '/' + slug : ''}`;
}
export function switchDocumentation(url: string, version: DocumentationVersion): string {
  const { slug } = documentationLocation(url);
  return documentationPath(version, version.guides.some(guide => guide.slug === slug) ? slug : undefined);
}
