import { NavigationEnd, Router } from '@angular/router';
import { inject as injectAnalytics, pageview } from '@vercel/analytics';

/** Analytics belongs to fastang.dev, never to generated applications. */
export function startSiteAnalytics(router: Router): () => void {
  if (!import.meta.env.PROD || !['fastang.dev', 'www.fastang.dev'].includes(window.location.hostname)) {
    return () => {};
  }

  injectAnalytics({
    mode: 'production',
    disableAutoTrack: true,
    beforeSend: (event) => {
      const url = new URL(event.url);
      url.search = '';
      url.hash = '';
      return { ...event, url: url.toString() };
    },
  });

  let previousPath: string | undefined;
  const recordPage = () => {
    const path = window.location.pathname;
    if (path === previousPath) return;
    previousPath = path;
    pageview({ path });
  };
  const subscription = router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) recordPage();
  });
  // Bootstrap may finish before the initial router navigation.
  if (router.navigated) recordPage();
  return () => subscription.unsubscribe();
}
