# Emergency Ready

A **Blume 2.2.3** (AI ready) site of official Australian emergency resources across 13 pages, built for one main state or territory (NSW by default). The register holds 83 records: 13 national, 27 NSW, and a core set for each other state and territory (VIC 9, QLD 7, WA 7, SA 3, TAS 5, ACT 8, NT 4; 43 in all). National and NSW resources were researched on 14 October 2026 (health and outbreaks resources added 16 October 2026, the national TIS National record 18 October 2026); the other states and territories were researched on 18 October 2026, and some of their core roles are marked for manual verification in [research/manual-verification.json](research/manual-verification.json). A NSW build lists all 83 records; a build for another state lists 63 (national, that state's and every other state's core records, including NSW's seven). Independent, unofficial, and not a live warning service.

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

## Switch your state

One build is focused on one main state or territory. Its national and state resources lead each page, and the core services of every other state and territory sit in an "Other states and territories" section at the bottom of the relevant pages.

1. Edit `data/site.json` and set `mainState` to one of `NSW`, `VIC`, `QLD`, `WA`, `SA`, `TAS`, `ACT` or `NT`. An unknown value fails the build.
2. Run `npm run build` (it regenerates `docs/*.mdx` and `public/resources.json`; commit them).
3. Run `npm test` and `npm run test:browser`.
4. Run `npm run checksums` to refresh `SHA256SUMS.json`.
5. Deploy `dist/` as described in [DEPLOY.md](DEPLOY.md).

For your own fork, also change the project names and links that point at this repository: `name` and `description` in `package.json`, `name` in `wrangler.json`, and the GitHub repository links in the `about` page template (`data/pages.json`), the `Contact` line of `public/.well-known/security.txt` and the footer link in `blume.config.ts`. A content test pins the `security.txt` contact URL (`tests/content.test.mjs`), so update it too.

To try another state without touching the committed files, generate into a scratch directory: `node scripts/generate-content.mjs --state QLD --out <dir>`. NSW has the fullest coverage; other states have a core set of seven roles (SES, fire, warnings, police, health, mental health, recovery), and a few are not yet covered (listed as `missingRoles` in `data/states/<CODE>.json`). Check [research/manual-verification.json](research/manual-verification.json) before deploying for a state other than NSW. See [MAINTAINING.md](MAINTAINING.md) for the data format.

## What's included

- `data/site.json`: the main state (`mainState`) for this build.
- `data/resources.json`: canonical national and NSW resource records, source URLs, phone numbers, scope, cautions and review dates.
- `data/states/<CODE>.json`: each state's name, the agency names page text uses, and (for states other than NSW) its core resource records.
- `data/pages.json`: canonical page narratives and resource selections.
- `scripts/generate-content.mjs`: generates `docs/*.mdx` and `public/resources.json` from those records. Runs automatically before builds.
- `docs/`: generated, editable-readable Blume content. Edit the data/templates rather than the generated MDX.
- `blume.config.ts`, `theme.css`, local Inter fonts and font licence.
- `dist/`: tested static build, local Orama search, Markdown mirrors and Blume's static JSON documentation surface.
- `wrangler.json`: optional Workers static-assets deployment, not required for Pages.
- `tests/`, `research/`, `reports/`, SHA-256 file manifest.
- Documentation for deployment, rebuilding, maintenance, verification and dependency limitations.

## Coverage

Urgent contacts; official weather/hazard/fire/road links; NSW RFS and MyFirePlan (in NSW builds); core services for every other state and territory; birdflu.gov.au and animal-disease reporting; mental-health/violence/youth support; health, flu, COVID-19 and vaccination information; household and animal preparation; accessible/relay/language resources; housing, recovery and legal assistance.

## Safety and privacy

The non-dismissible banner points to 000. Non-emergency lines and animal-disease reporting are distinguished from human emergency response. 106 is labelled TTY/TDD only and is deliberately **not** a mobile tap-to-call button. No advice chatbot, tracking, signup, external font requests or embedded third-party maps. Hosting logs and browser/device traces can still exist. No quick-exit or offline-availability promise.

## Offline re-creation

The main download includes prebuilt deployable files and source, not `node_modules`. For a network-free rebuild on a compatible **Linux x64 glibc** host, also download and extract the optional offline-support archive alongside this project. It contains the locked npm tarball cache and the Linux Chromium headless-shell/FFmpeg files used in testing. Node/npm and browser system libraries must already exist on that host. See [BUILDING.md](BUILDING.md). Other operating systems can deploy `dist/` without rebuilding, or install dependencies online normally.

## Before production

Choose your final domain; optionally publish a real owner/corrections contact; recheck safety-critical contacts and official sources; read [SECURITY.md](SECURITY.md) for remaining build-dependency advisories. No Cloudflare account was accessed and nothing was deployed publicly by this build.
