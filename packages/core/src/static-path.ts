export function staticFile(path: string): string {
  if (!path.startsWith('/') || path.includes('//') || !/^\/[a-zA-Z0-9_/-]*$/.test(path) || path.split('/').includes('..')) {
    throw new Error(`Percorso di prerendering non supportato: ${path}`);
  }
  return `${path.replace(/^\/|\/$/g, '')}${path === '/' ? '' : '/'}index.html`;
}

