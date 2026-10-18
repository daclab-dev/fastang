export const guideNavigation = [
  { slug: 'getting-started', it: 'Inizia qui', en: 'Get started' },
  { slug: 'routing', it: 'Pagine e layout', en: 'Pages and layouts' },
  { slug: 'api', it: 'API e validazione', en: 'APIs and validation' },
  { slug: 'typed-api', it: 'Contratti API tipizzati', en: 'Typed API contracts' },
  { slug: 'rendering', it: 'Dati e rendering', en: 'Data and rendering' },
  { slug: 'errors', it: 'Errori e redirect', en: 'Errors and redirects' },
  { slug: 'configuration', it: 'Configurazione e plugin', en: 'Configuration and plugins' },
  { slug: 'upgrading', it: 'Aggiornare il progetto', en: 'Upgrade a project' },
  { slug: 'reference', it: 'API pubbliche e supporto', en: 'Public API and support' },
  { slug: 'deployment', it: 'Deploy', en: 'Deployment' },
] as const;
export type GuideSlug = typeof guideNavigation[number]['slug'];
