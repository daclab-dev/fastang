# FastAng guides

These tutorials target `0.1.0-alpha.5`. The website renders the same Markdown files at `/docs` and `/en/docs`.

| Topic | Italiano | English |
| --- | --- | --- |
| First project | [Inizia qui](it/getting-started.md) | [Get started](en/getting-started.md) |
| Routing | [Pagine e layout](it/routing.md) | [Pages and layouts](en/routing.md) |
| Server | [API e validazione](it/api.md) | [APIs and validation](en/api.md) |
| Rendering | [Dati, SSR e prerendering](it/rendering.md) | [Data, SSR and prerendering](en/rendering.md) |
| Signal route data (preview) | [Route Resources](it/router-resources.md) | [Route Resources](en/router-resources.md) |
| Errors | [Errori e redirect](it/errors.md) | [Errors and redirects](en/errors.md) |
| Configuration | [Plugin e ambiente](it/configuration.md) | [Plugins and environment](en/configuration.md) |
| Deployment | [Node e Vercel](it/deployment.md) | [Node and Vercel](en/deployment.md) |

Each code fence marked `file=...` contains a complete application file. The executable documentation check applies those files to fresh copies of `examples/starter`, builds the app and tests the behavior described in the guides. Code examples must match across languages.

```sh
npm run test:docs
```

Before v1, only current guides are published. The version selector and versioned
URLs remain, but previous alpha snapshots are not kept on the site. Git tags
preserve their sources. Stable documentation archives start with v1; the archive
command rejects pre-v1 versions. See the release guide for the workflow.

## AI-readable documentation

The website publishes `/llms.txt` as a concise documentation index and
`/llms-full.txt` with the complete English guides. Every guide is also available
as Markdown at `/docs/<slug>.md` (Italian) and `/en/docs/<slug>.md` (English).
These URLs track the current release.

`scripts/generate-ai-docs.ts` generates these assets from the same sources as the
website whenever Vite starts for development or a build. Edit the guide sources,
not the generated files in `public/`. Relative guide links become absolute links
to their Markdown counterparts.

To give a coding assistant context, ask it to read
`https://fastang.dev/llms.txt` and follow the relevant guides. Assistants must
explicitly fetch these resources; publishing the files does not guarantee that
every AI tool discovers them automatically.
