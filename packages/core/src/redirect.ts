/** Solo destinazioni locali: gli header Host del client non decidono l'origine. */
export function normalizeRedirectLocation(location: string): string {
  if (!location.startsWith('/') || location.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(location)) {
    throw new Error('Destinazione redirect non valida');
  }
  const target = new URL(location, 'http://fastang.local');
  if (target.origin !== 'http://fastang.local') throw new Error('Redirect esterno non consentito');
  // La normalizzazione può trasformare /a/..//host in //host: ricontrolla l'output.
  if (target.pathname.startsWith('//')) throw new Error('Destinazione redirect ambigua');
  return target.pathname + target.search + target.hash;
}
