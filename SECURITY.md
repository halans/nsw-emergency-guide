# Dependency and safety notes

## What ships to visitors

This deployment is static HTML/CSS/JavaScript with a browser-local search index and self-hosted fonts. No Node process, AI assistant, Vercel adapter or Markdown parser service runs on Cloudflare for this site. Static output has a smaller runtime attack surface, but that does not make its build dependencies risk-free.

## Audit outcome on 14 October 2026

The initial Blume installation reported 10 dependency findings (4 high, 6 moderate). The high-severity dependency chain through the unused Vercel adapter's `path-to-regexp` was mitigated with a scoped override:

```json
{"@vercel/routing-utils":{"path-to-regexp":"6.3.0"}}
```

After installation with that override, npm reported **7 moderate findings, 0 high and 0 critical**. The remaining reported packages/chains are `postcss-selector-parser`, `@tailwindcss/typography`, `sprintf-js`, `argparse`, `js-yaml`, `gray-matter`, and the aggregate Blume advisory entry. See `reports/dependency-audit.json` for exact advisory text and dependency paths. Some are aggregate affected-package counts, not seven independent vulnerabilities.

`npm audit fix --force` proposed downgrading Blume to an unrelated 0.0.0 version; this was not applied. No blanket major-version parser overrides were used. Build only trusted repository content, review upstream updates, and rerun the full tests before changing dependencies. Dependency scans require network access and evolve after this report date.

## Directory-specific safety

- The 000 call-to-action is non-dismissible; advice and recovery lines are labelled.
- 106 is TTY/TDD only and not an SMS or general mobile call action.
- No assertions that a place is safe based on a map, warning absence or this site.
- No copied live incident/disease counts or promises of current grant eligibility.
- No chatbot that could improvise emergency advice.
- No tracking, account forms or external map embeds.
- No quick-exit or browsing-history erasure claim.
- No service worker caches an old warning feed; this site does not carry a feed.

## Hosting and deployment

Use your own new Cloudflare destination, HTTPS, correct canonical origin and appropriate account permissions. CLI login/credentials remain on the user's own machine or in CI secrets, not in this repository. A Wrangler dry run was run; no real deployment was executed. Wrangler telemetry was disabled for the packaged deployment-check command.
