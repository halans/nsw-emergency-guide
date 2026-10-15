# Verification

## Reference results

See the files in `reports/`, captured from actual runs rather than illustrative output:

- `doctor.txt`: Blume reports 12 pages, static output, Orama search, no analytics and assistant off; no problems found.
- `validate.txt`: Blume reports no broken local links.
- `build.txt`: production compilation to static output.
- `content-tests.txt`: 64 passing Node tests for schema/provenance, known phone fixtures, required sites, source-register parity, generated content, built internal links/anchors and Cloudflare routing.
- `browser-tests.txt`, `browser-results.json`: 33 passing Chromium desktop/phone tests; one deliberately skipped desktop copy of the phone-only drawer test.
- `external-links.json`: 33 unique external URLs checked; 29 returned HTTP 200 and four required browser/manual review. No HTTP 404/410 failures were observed. Browser observations for those four are in `research/manual-verification.json`; two are the bird flu short/canonical URL pair.
- `cloudflare-dry-run.txt`: Wrangler accepted the static-assets deployment config; dry run only.
- `offline-install.txt`, `offline-build.txt`, `offline-tests.txt`: clean installation from the supplied npm cache in offline mode, followed by a successful build and 64 passing content tests. The supplied offline browser files also ran 33 browser tests successfully; see offline-browser-tests.txt.
- `dependency-audit.json`: remaining dependency findings; see SECURITY.md.
- Screenshots show the desktop home and fresh-loaded phone home. An early resize-transition screenshot was discarded rather than treated as the final phone view.

The browser tests cover all 12 routes for overflow, h1 and emergency-banner visibility; actual search for a resource detail; phone drawer navigation; dark mode; no-JavaScript essential reading; and a 320px-wide viewport. They do not claim a full WCAG audit or testing on physical iOS/Safari devices.

## Run checks

```sh
npm run build
npm run doctor
npm run validate
npm test
npx playwright install chromium
npm run test:browser
npm run deploy:check
npm run check:links
```

The Playwright install command is needed only if Chromium is not already installed. For the optional offline kit, use `PLAYWRIGHT_BROWSERS_PATH=../offline-support/browsers` instead; see BUILDING.md.

`npm run check:links` writes a fresh report. An explicit 404/410 sets exit code 1. Timeouts, challenges and other statuses are marked `needs-review` without falsely declaring the resource broken. Review them manually. HTTP 200 alone cannot validate phone numbers or safety advice.

## Content integrity

Run `node scripts/checksums.mjs --verify` on the extracted release before modifying/building it. Rebuilds and new reports can legitimately change hashes; regenerate the manifest only after intentional edits and successful checks.

## Exit behaviour

Node tests and Playwright exit non-zero on failures. Blume's doctor/build/validate commands use their upstream exit behaviour. This is not a custom linter CLI and does not define additional reporter/severity APIs. The link checker emits JSON plus console output; browser tests emit JSON plus list output.
