# Build and re-create

## Normal online installation

Node 22.19+ is required by Blume. The reference run used Node 24.14.1, npm 11.11.0, Blume 2.2.3, Playwright 1.64.0 (see lockfile for the authoritative version) and Wrangler 4.150.0. Use the pinned package-lock rather than upgrading during a rebuild.

```sh
npm ci
npm run build
npm run doctor
npm run validate
npm test
```

`prebuild` regenerates the 12 `.mdx` pages and downloadable register from the canonical JSON files. Blume creates its `.blume/` runtime and compiles to `dist/`. Fonts are local and no provider download is needed. There is no separate handwritten HTML fallback engine.

Use `npm run preview` for serving. Opening `dist/index.html` as a file URL is not equivalent to deploying a site: module scripts and search require HTTP.

## Offline Linux x64 rebuild

Extract the main source ZIP and the optional offline-support archive into the same parent directory:

```text
parent/
  nsw-emergency-guide/
  offline-support/
    npm-cache/
    browsers/
    OFFLINE.md
```

Node/npm must already be installed. The cache covers the locked Linux x64 glibc dependencies, including native optional packages selected on the reference host. It is not a universal cache for macOS, Windows, ARM or musl Linux.

From `nsw-emergency-guide`:

```sh
node scripts/checksums.mjs --verify
npm ci --offline --cache ../offline-support/npm-cache --no-audit --no-fund
npm run build
npm test
npm run doctor
npm run validate
PLAYWRIGHT_BROWSERS_PATH=../offline-support/browsers npm run test:browser
```

Playwright's browser still needs normal host shared libraries. The tested host was Linux x64 glibc (Amazon Linux 2023). The browser files are included so no browser download is necessary on a compatible host. This does not bundle Node, an operating system, or arbitrary other-platform native binaries.

External link checks, registry vulnerability checks and actual Cloudflare deployment are intentionally network operations, and are not part of the offline rebuild. Existing research notes and verification reports are bundled as dated evidence.

## Integrity and archive re-creation

`SHA256SUMS.json` covers packaged source, docs, fonts, reports and prebuilt output, excluding itself and transient/dependency directories. Run verification before rebuilding because a rebuild can legitimately change emitted files or report timestamps.

After making an intentional update and rerunning checks:

```sh
npm run checksums
```

Re-create a source ZIP containing the project directory while excluding `node_modules`, `.blume`, `.wrangler`, `test-results`, `.git` and any ZIP/tarball being produced. Create the Pages upload ZIP from the **contents** of `dist/`, not its parent directory. The top level of that upload ZIP must contain `index.html`.

The offline-support archive is optional and separate to keep the deployable site small. It holds public dependency tarballs, not credentials or the entire shared npm cache. Its own file manifest is supplied in the archive.
