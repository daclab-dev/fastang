import type { Route } from '@angular/router';

/** Metadati Angular; percorso, componente e gerarchia sono generati dai file. */
export type RouteMetadata = Pick<Route,
  | 'title' | 'data' | 'resolve' | 'providers' | 'runGuardsAndResolvers'
  | 'canActivate' | 'canActivateChild' | 'canDeactivate' | 'canMatch'
>;
