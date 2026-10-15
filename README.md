# Emergency Ready

A **Blume 2.2.3** (AI ready) site: 39 Australian national and NSW resources across 13 pages, researched on 14 October 2026 (health and outbreaks resources added 16 October 2026). Independent, unofficial, and not a live warning service.

## Deploy without a build

Upload the contents of `dist/` to a new Cloudflare Pages Direct Upload project. **Do not upload this source-project ZIP as the website.** See [DEPLOY.md](DEPLOY.md).

Configure `SITE_URL` to your own stable HTTPS origin and rebuild when you know the final domain. Do not invent a domain or use a per-deployment preview URL for production canonical metadata.

## Build and preview

Requires Node 22.19+ (tested with Node 24.14.1 and npm 11.11.0).

```sh
npm ci
npm run build
npm test
npm run preview
```

Open the local URL printed by the preview command. Local browser testing is documented in [VERIFY.md](VERIFY.md). CLI instructions are for your own computer or CI, not a terminal inside Hyperagent.

## What's included

- `data/resources.json`: canonical resource records, source URLs, phone numbers, scope, cautions and review dates.
- `data/pages.json`: canonical page narratives and resource selections.
- `scripts/generate-content.mjs`: generates `docs/*.mdx` and `public/resources.json` from those records. Runs automatically before builds.
- `docs/`: generated, editable-readable Blume content. Edit the data/templates rather than the generated MDX.
- `blume.config.ts`, `theme.css`, local Inter fonts and font licence.
- `dist/`: tested static build, local Orama search, Markdown mirrors and Blume's static JSON documentation surface.
- `wrangler.json`: optional Workers static-assets deployment, not required for Pages.
- `tests/`, `research/`, `reports/`, SHA-256 file manifest.
- Documentation for deployment, rebuilding, maintenance, verification and dependency limitations.

## Coverage

Urgent contacts; official weather/hazard/fire/road links; NSW RFS and MyFirePlan; birdflu.gov.au and animal-disease reporting; mental-health/violence/youth support; health, flu, COVID-19 and vaccination information; household and animal preparation; accessible/relay/language resources; housing, recovery and legal assistance.

## Safety and privacy

The non-dismissible banner points to 000. Non-emergency lines and animal-disease reporting are distinguished from human emergency response. 106 is labelled TTY/TDD only and is deliberately **not** a mobile tap-to-call button. No advice chatbot, tracking, signup, external font requests or embedded third-party maps. Hosting logs and browser/device traces can still exist. No quick-exit or offline-availability promise.

## Offline re-creation

The main download includes prebuilt deployable files and source, not `node_modules`. For a network-free rebuild on a compatible **Linux x64 glibc** host, also download and extract the optional offline-support archive alongside this project. It contains the locked npm tarball cache and the Linux Chromium headless-shell/FFmpeg files used in testing. Node/npm and browser system libraries must already exist on that host. See [BUILDING.md](BUILDING.md). Other operating systems can deploy `dist/` without rebuilding, or install dependencies online normally.

## Before production

Choose your final domain; optionally publish a real owner/corrections contact; recheck safety-critical contacts and official sources; read [SECURITY.md](SECURITY.md) for remaining build-dependency advisories. No Cloudflare account was accessed and nothing was deployed publicly by this build.
