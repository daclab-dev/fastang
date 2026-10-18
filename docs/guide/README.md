# FastAng guides

These tutorials target `0.1.0-alpha.2`. The website renders the same Markdown files at `/docs` and `/en/docs`.

| Topic | Italiano | English |
| --- | --- | --- |
| First project | [Inizia qui](it/getting-started.md) | [Get started](en/getting-started.md) |
| Routing | [Pagine e layout](it/routing.md) | [Pages and layouts](en/routing.md) |
| Server | [API e validazione](it/api.md) | [APIs and validation](en/api.md) |
| Rendering | [Dati, SSR e prerendering](it/rendering.md) | [Data, SSR and prerendering](en/rendering.md) |
| Errors | [Errori e redirect](it/errors.md) | [Errors and redirects](en/errors.md) |
| Configuration | [Plugin e ambiente](it/configuration.md) | [Plugins and environment](en/configuration.md) |
| Deployment | [Node e Vercel](it/deployment.md) | [Node and Vercel](en/deployment.md) |

Each code fence marked `file=...` contains a complete application file. The executable documentation check applies those files to fresh copies of `examples/starter`, builds the app and tests the behavior described in the guides. Code examples must match across languages.

```sh
npm run test:docs
```

The current guides live here; released snapshots and their source metadata live in `docs/versions/`. The website version selector keeps version-specific URLs and navigation. Before moving to a new current release, use `npm run docs:archive -- VERSION GIT_REF` and follow the release guide.
