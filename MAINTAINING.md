# Maintain and extend the directory

## One content source of truth

Edit `data/resources.json` for national and NSW contacts and summaries, `data/states/<CODE>.json` for the other states and territories, and `data/pages.json` for page narratives and resource placement. `data/site.json` (`{"mainState": "NSW"}`) picks the state a build is focused on; see the README for switching. The generator produces searchable, literal MDX text rather than a runtime-only component, so rendered pages, local search, Markdown mirrors and the downloadable resource register all contain the resource details. Tests compare the public register to the canonical JSON and reject generated-content drift.

Do not patch `dist/` or generated `docs/*.mdx` as the authoritative fix. The next build replaces them.

## Resource record

Required fields: `id` (unique kebab-case key), `category`, `name`, `url` (official HTTPS source), `summary`, `jurisdiction` (`Australia` or one state code: `NSW`, `VIC`, `QLD`, `WA`, `SA`, `TAS`, `ACT`, `NT`), `reviewed` (ISO date). Optional: `phone` (digits and spaces only), `phoneLabel`, `hours`, `caution`, `language`, `resolvedUrl`, `corroboratingSource`, `roles`.

`roles` marks a state record as one of the seven core services shown for that state everywhere: `ses`, `fire`, `warnings`, `police`, `health`, `mentalHealth`, `recovery`. A combined agency may list several roles. A state may have more than one record for a role (for example two fire services): `role:` tokens and the bottom section show all of them, in file order, each record once per page. `{{phone:role}}` and `{{tel:role}}` use the first. National records have no roles. Records with roles appear in every build (as the main state's cards, or in the "Other states and territories" section); NSW records without roles appear only when NSW is the main state.

IDs must be unique across `data/resources.json` and every state file (the loader fails on a duplicate). The tests accept the `reviewed` dates in the `REVIEWED` pattern in `tests/state.test.mjs` and `tests/content.test.mjs`; widen it deliberately when re-reviewing.

Example captured from the actual dataset:

```json
{
  "id": "police",
  "category": "urgent",
  "name": "Police Assistance Line",
  "jurisdiction": "NSW",
  "phone": "131 444",
  "url": "https://www.police.nsw.gov.au/contact_us_form",
  "reviewed": "2026-10-14"
}
```

The example is an excerpt; the full record also requires its summary. The renderer strips spaces for normal `tel:` links. The relay record is a deliberate exception: 106 remains a TTY-only label, not a general mobile dial button. Do not generalise this without reviewing the accessibility guidance.

## State files

NSW's records live in `data/resources.json`; `data/states/NSW.json` holds only its vocabulary. Every state file has this shape:

```json
{
  "name": "Queensland",
  "longName": "Queensland",
  "terms": { "ses": "…", "fire": "…", "warnings": "…", "police": "…", "health": "…", "mentalHealth": "…", "recovery": "…" },
  "missingRoles": [],
  "resources": []
}
```

`name` is the short form used in page text ("NSW", "Queensland"), `longName` the full name. `terms` gives the agency name for each of the seven roles (all seven, non-empty). `resources` holds that state's records, each with its own code as `jurisdiction`. `missingRoles` lists roles with no verified record; a role must be either covered or listed, never both, and `ses` can never be missing. Pages skip a missing role instead of guessing.

Evidence for each state goes in `research/states/<CODE>.json` (URL, date checked, method, what the page said). Anything blocked, challenged or conflicting goes in `research/manual-verification.json` with its `state`, not into the data as a guess. Test fixtures in `tests/fixtures/states/<CODE>.json` pin each state's phone numbers (`phones`, by record id) and required source URLs (`requiredUrls`, which must belong to that state's or a national record); update them only after checking the official source. `npm test` checks every state's data and generates every state into a temporary directory.

## Page template

Each page has `slug`, `title`, `description`, `body`, and optionally `roles`, `stateBlocks` and `stateNote`. Use `{{resources:id-one,id-two}}` to render selected resource cards; `{{all-resources}}` renders every record visible in the build. A list shows only national and main-state records, so other states' ids are skipped.

State-aware syntax, usable in `title`, `description` and `body`:

- `{{state}}` and `{{state-long}}`: the main state's `name` and `longName`.
- `{{term:role}}`: the main state's agency name for a role; `{{phone:role}}` and `{{tel:role}}`: the phone of its first record for that role, as written or as digits for a `tel:` link. A missing value fails the build.
- `role:<role>` inside a resource list, for example `{{resources:role:fire,myfireplan}}`: every main-state record for that role (skipped if the role is in `missingRoles`). A record already listed in the same token is not repeated.
- `{{state-block:key}}`: the text in `stateBlocks.key.<CODE>` for the main state, else `stateBlocks.key["*"]`, else nothing. Write a state's block only from that state's own official source; keep `"*"` generic, with no state-specific claims. An empty own block suppresses the fallback.

`roles` lists the core roles whose other-state records the page shows in its "Other states and territories" section. `stateNote: true` adds a short note when the build has no main-state content on that page (in practice, thin pages in non-NSW builds). The index slug maps to `/`. Other slugs map to their clean route.

Add a page by adding its template to `data/pages.json`, updating the ordered slugs in `docs/meta.ts`, and extending browser-test routes. Add resource selection tokens instead of copying a second version of contact details. Update phone fixtures deliberately after checking the new official source.

## Review procedure

1. Open the official source and check the actual content, not just HTTP status or a search snippet.
2. Verify phone, purpose, jurisdiction, access limitations and published hours. Do not invent missing hours.
3. Record the review date and relevant facts in `research/`.
4. Update the canonical data/templates and any dated introductory notes.
5. Run build, doctor, link validation, content tests and browser tests.
6. Record network-blocked or challenged sources as needing manual review, not closed services.
7. Review dependency-audit changes, refresh manifests and package a new release.

Review safety-critical phone numbers more frequently than general background links. Current incident counts, disease totals, grant amounts and evacuation-centre opening statuses intentionally stay with official publishers rather than being copied into this static directory.

## API boundaries

There is no custom application API or backend. `resources.json` is the static directory data. Blume also emits static documentation JSON and Markdown mirrors. These are build artifacts, not live warning endpoints. No authentication, submissions, incident reporting or personal-data storage is implemented.
