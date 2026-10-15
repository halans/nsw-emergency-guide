# Deploy to Cloudflare

The site is static. No Worker code, secrets, database, assistant backend or Cloudflare adapter is required. Both deployment paths use the same Blume `dist/` output. This project has not been deployed into any account.

## Option A: Cloudflare Pages Direct Upload — simplest

1. In Cloudflare, open **Workers & Pages** and create a new Pages application using **Direct Upload / Drag and drop**.
2. Choose a new project name that you own.
3. Upload `emergency-ready-cloudflare-upload.zip`, or drag in the `dist/` folder from this project. The ZIP has `index.html`, `_astro/`, page folders and other site assets at its root.
4. Deploy. Check `/`, `/urgent-help`, `/bird-flu`, `/warnings`, search, a missing URL and phone navigation on the assigned domain.
5. Add a custom domain through that project's settings if desired.

Cloudflare's documented drag-and-drop limits are 1,000 files and 25 MiB per file. This site is below both limits. A Direct Upload project cannot later switch to Git integration; create a separate Git-integrated project if you want that workflow. See the official docs below for UI changes and current limits.

The prebuilt portable bundle has no production sitemap/canonical origin. It is usable immediately. For production SEO, rebuild with `SITE_URL` set to your stable deployed domain, then upload the refreshed `dist/`.

### Pages via local Wrangler

Run these on your own computer or CI. The project pins Wrangler as a development dependency.

```sh
npm ci
npx wrangler login
npx wrangler pages project create YOUR_NEW_PROJECT_NAME --production-branch main
npx wrangler pages deploy dist --project-name YOUR_NEW_PROJECT_NAME --branch main
```

Replace `YOUR_NEW_PROJECT_NAME`; do not blindly reuse another project's name. Login is interactive in your browser. Never put tokens in chat or commit them.

## Option B: Cloudflare Pages Git integration

Create a new Git repository from this source project, then connect it to a new Pages project. Do not use a repository containing unrelated work.

| Setting | Value |
|---|---|
| Framework preset | None / custom |
| Root directory | This project directory |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 24.14.1, or another supported Node 22.19+ |
| SITE_URL environment variable | Your stable final HTTPS origin |

The build automatically regenerates Markdown content. Keep `package-lock.json` and local fonts committed. Do not commit `node_modules`, `.blume` or `.wrangler`. The supplied `.gitignore` excludes generated build output; Cloudflare creates it during the build.

## Option C: Workers static assets

The supplied `wrangler.json` configures `assets.directory` as `./dist`, clean URL handling as `drop-trailing-slash`, and real 404 handling as `404-page`. It uses no SSR adapter.

1. Change `name` in `wrangler.json` to the new Worker name you own.
2. Build with your stable `SITE_URL` if known.
3. Run the dry run before deploying:

```sh
npm ci
npm run build
npm run deploy:check
npx wrangler login
npx wrangler deploy
```

`deploy:check` is a dry run and makes no deployment. The final `wrangler deploy` is a real public write into your chosen account; review the target first. Cloudflare may require a lower supported compatibility date in an older environment; use a supported date rather than copying a future date.

## Canonical URL and sitemap

Set `SITE_URL` in the build environment to the final HTTPS origin, with no path. `blume.config.ts` validates that shape, enables a sitemap when it is set, and supplies it to Blume's deployment config. On a POSIX shell:

```sh
SITE_URL=https://YOUR_ACTUAL_DOMAIN npm run build
```

The capitalised domain above is a placeholder. For Windows, set the same variable using your shell's environment-variable syntax. Rebuild when moving domains. Do not edit links in emitted `dist/` by hand.

## Checks after deployment

- Verify the 000 banner, tap-to-call numbers and TTY-only 106 label.
- Search for “Poisons” and “MyFirePlan”.
- Open `/warnings` and each required external resource.
- Try a mobile menu navigation and both light/dark modes.
- Open a made-up URL: it should be a real 404, not a home-page SPA fallback.
- Confirm the final domain in canonical tags/sitemap after a SITE_URL build.
- Roll back using Cloudflare's deployment history if a new release fails.

## Primary deployment documentation

- Blume: https://useblume.dev/docs/deployment
- Pages direct upload: https://developers.cloudflare.com/pages/get-started/direct-upload/
- Workers static assets: https://developers.cloudflare.com/workers/static-assets/get-started/
