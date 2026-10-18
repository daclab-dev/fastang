import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guideNavigation } from '../src/app/docs/navigation';
import { CURRENT_DOCS_VERSION } from '../src/app/docs/versions';

/** Publish the same guide sources used by the website, without HTML navigation. */
export function generateAiDocs(): void {
  const root = resolve(import.meta.dirname, '..');
  const origin = 'https://fastang.dev';
  const summary = `# FastAng\n\n> FastAng combines Angular pages and Fastify APIs in a TypeScript full-stack framework with file-based routing, server-side rendering, explicit prerendering and a Vercel adapter.\n\nCurrent release: ${CURRENT_DOCS_VERSION} (experimental alpha). These guides describe the current release; before v1, older alpha documentation is not hosted. Check the installed package version before applying examples.\n\nUse Angular components, guards, resolvers and HttpClient for the frontend. Use native Fastify request/reply objects and plugins for the backend. Keep server code and secrets out of browser imports. FastAng does not use React Server Components or Next.js APIs.\n\nCreate an app with \`npm create fastang@alpha my-app -- --install\` or \`pnpm create fastang@alpha my-app --install\`. Run \`npm run dev\` or \`pnpm run dev\` inside the app; the default port is 3278. The npm release channel is \`alpha\`; do not assume a stable \`latest\` release exists. Read the guides for runtime requirements, public APIs and supported deployment modes.\n`;
  const sections: string[] = [];
  const full: string[] = [summary];
  for (const language of ['en', 'it'] as const) {
    const prefix = language === 'en' ? '/en/docs' : '/docs';
    const directory = resolve(root, 'public', prefix.slice(1));
    mkdirSync(directory, { recursive: true });
    const links: string[] = [];
    for (const guide of guideNavigation) {
      const source = readFileSync(resolve(root, `docs/guide/${language}/${guide.slug}.md`), 'utf8');
      // Keep guide-to-guide links usable when fetched outside the website.
      const markdown = source.replace(/\]\((?:\.\/)?([a-z-]+)\.md(#[^)]+)?\)/g,
        (_match, slug: string, anchor: string | undefined) => `](${origin}${prefix}/${slug}.md${anchor ?? ''})`);
      writeFileSync(resolve(directory, `${guide.slug}.md`), markdown);
      links.push(`- [${guide[language]}](${origin}${prefix}/${guide.slug}.md)`);
      if (language === 'en') full.push(`---\n\nSource: ${origin}${prefix}/${guide.slug}.md\n\n${markdown}`);
    }
    sections.push(`## ${language === 'en' ? 'English guides' : 'Guide in italiano'}\n\n${links.join('\n')}`);
  }
  writeFileSync(resolve(root, 'public/llms.txt'), `${summary}\n${sections.join('\n\n')}\n\n## Optional\n\n- [Complete English documentation](${origin}/llms-full.txt): All current guides in one file.\n- [Source and issues](https://github.com/daclab-dev/fastang): Framework source, examples and issue tracker.\n- [Release notes](https://github.com/daclab-dev/fastang/releases): Changes and migration notes.\n`);
  writeFileSync(resolve(root, 'public/llms-full.txt'), full.join('\n\n') + '\n');
}
