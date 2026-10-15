# Maintain and extend the directory

## One content source of truth

Edit `data/resources.json` for contacts and summaries, and `data/pages.json` for page narratives and resource placement. The generator produces searchable, literal MDX text rather than a runtime-only component, so rendered pages, local search, Markdown mirrors and the downloadable resource register all contain the resource details. Tests compare the public register to the canonical JSON and reject generated-content drift.

Do not patch `dist/` or generated `docs/*.mdx` as the authoritative fix. The next build replaces them.

## Resource record

Required fields: `id` (unique kebab-case key), `category`, `name`, `url` (official HTTPS source), `summary`, `jurisdiction` (Australia / NSW / NSW / Australia), `reviewed` (ISO date). Optional: `phone` (digits and spaces only), `phoneLabel`, `hours`, `caution`, `language`, `resolvedUrl`, `corroboratingSource`.

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

## Page template

Each page has `slug`, `title`, `description`, `body`. Use `{{resources:id-one,id-two}}` to render selected resource cards; `{{all-resources}}` renders the full source register. The index slug maps to `/`. Other slugs map to their clean route.

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
