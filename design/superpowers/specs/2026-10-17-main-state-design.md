# Main-state flag: design

Date: 2026-10-17. Status: awaiting approval.

## Intent

Emergency Ready is an independent directory of official Australian emergency resources. Today it is built around NSW: 26 NSW records, 1 mixed record and 12 national records, with NSW agency names written into page text, the site description and the tests.

The owner wants anyone to be able to clone the repo, change one setting, rebuild, and get the same site focused on their own state or territory. The people this helps are forkers in VIC, QLD, WA, SA, TAS, ACT and NT who want a locally focused deployment, and the readers of those sites, who should see their own state's services first.

The site has a **main state**. National resources and the main state's resources are the headline content. Every other state and territory is still reachable, in a section at the bottom of each page, so a reader who is travelling or lives near a border can find the right service.

## Decisions already made with the owner

- One setting, `MAIN_STATE`, with eight valid values: NSW, VIC, QLD, WA, SA, TAS, ACT, NT. The default is NSW.
- When the main state is NSW the site reads as it does today, plus the new bottom section.
- When the main state is, say, QLD, QLD's resources sit with the national ones at the top, all state-specific wording follows QLD, and NSW moves into the bottom section with the other states.
- Every page gets an "Other states and territories" section at the bottom. My guess, which the owner approved, is that it lists only the other states' services relevant to that page (fire authorities on the bushfire page, health departments on the health page, and so on).
- Other states get a **core set**, not full parity with NSW. About 7 services per state or territory. The NSW resources that have no core equivalent (pets, assistance animals, traffic, legal aid, evacuation centres and similar) stay NSW-only and show only when NSW is the main state.
- Core set, proposed to and accepted by the owner:
  1. State emergency service (SES equivalent)
  2. Fire and rescue authority
  3. Official warnings and incidents site
  4. Police non-emergency number
  5. State health department, with its public health or infectious disease page
  6. State mental-health crisis line
  7. State recovery and disaster-assistance page
- Research for the other seven states and territories is part of this work, using government sources only.

## Goals

- A fork changes one value, runs the build, and gets a correct, fully tested site for another state, with no hand-editing of generated files.
- Every record for every state meets the standard the NSW records meet today: official HTTPS URL, verified phone numbers, reviewed date, evidence kept in `research/`.
- No wording on a page names or describes the wrong state. No NSW agency name or NSW-sourced claim appears in a QLD build outside the "other states" section.
- The README and `MAINTAINING.md` explain how to switch state and how to keep a state's records current.

## Non-goals

- Full NSW-style coverage for the other seven states. Non-core NSW resources are not replicated.
- Runtime state switching, geolocation or a state picker in the browser. The site stays static and has no runtime third-party requests. The state is chosen at build time.
- Multi-state deployments from one build. One build is one main state.
- Local councils, regional services, or any live data.

## Anti-goals (failures even if it technically works)

- A phone number or URL for another state that was guessed, recalled from memory, or not checked against the official source.
- NSW-specific facts (for example "NSW Health's respiratory guidance says...") reworded to sound like another state's.
- Live data of any kind: incident counts, outbreak totals, warning levels, evacuation-centre status. The `warnings` page must still say no live warnings are reproduced.
- Changes to the current NSW build beyond the added bottom section. The NSW build is the regression baseline.
- A silent fallback. An unknown `MAIN_STATE` value must fail the build with a clear error. A state missing a core service must be flagged in research notes and by a test, not hidden.

## Constraints from the repo (see CLAUDE.md)

- Content flows `data/*.json` to `scripts/generate-content.mjs` to `docs/*.mdx` and `public/resources.json`. The generated files are committed and a test fails on drift. The state setting must therefore live in a committed data file (my call: `data/site.json` with `mainState`), not an environment variable, so a fork edits it, rebuilds and commits the generated output. `SITE_URL` stays an environment variable.
- Phone links are `tel:` with spaces stripped, except the `relay` record (106), which stays plain text. Nothing in this work generalises that.
- The agent-facing Markdown (`llms-full.txt`, `.md`, `.mdx`) must stay free of JSX. The generator wraps HTML in `<Visibility for="web">` with a plain-Markdown twin, with no headings in the agents-only twin. The new bottom section must follow the same rule.
- Required fixtures (the four named sources, the pinned phone numbers) are updated only after checking the official source.
- `reviewed` dates are pinned by a test regex to 2026-10-14 or 2026-10-16. New records will carry the date they are verified, so the regex is widened deliberately.
- No remote scripts, stylesheets or fonts in built HTML. Sources that block automated checks go in `research/manual-verification.json`, not as closed services.
- After intentional changes, `npm run checksums` refreshes `SHA256SUMS.json`.
- Do not upgrade dependencies.

## How it works (the owner approved the shape; the details are my calls)

**State data.** Each resource gets a `jurisdiction` of `Australia` or a state code, and core-set records also get a `role` naming which of the seven core services they fulfil. A combined agency (for example the ACT Emergency Services Agency, or NT Police, Fire and Emergency Services) may fulfil more than one role. NSW's existing records are migrated onto this scheme: `ses`, `police`, `rfs`, `hazardwatch`, `nsw-phu`, `mental-health` and `service-nsw` are the likely core records.

**State vocabulary.** A per-state data file holds the state's name and the agency names that page text refers to ("NSW RFS" becomes the state's fire authority, "Get Ready NSW" becomes the state's preparation site, and so on). Page bodies use placeholders for these. The site description, the home page and the README text use the same values.

**NSW-only prose.** Some page text states facts sourced from NSW pages (the warnings page describing NSW's three warning levels, the health page summarising NSW Health's respiratory guidance). These become per-state blocks that only the state they were sourced from provides. For other states a block exists only if someone has written it from that state's official source. Without one, the page shows the state's resource cards and the general text only.

**Page layout.** For the main state: national records, then the main state's records for that page. At the bottom of each page, an "Other states and territories" section lists the other states' core records for the roles that page cares about. Which roles each page shows is my first guess, for the builder to settle: urgent-help (police, SES), warnings (warnings, SES), bushfire (fire), health (health), crisis-support (mental-health), recovery (recovery), prepare (SES, fire). The remaining pages (bird-flu, animals, accessible-help, sources, about) show nothing, or for `sources` the full register.

**Sources page.** `{{all-resources}}` lists everything that appears anywhere in the build: national, main state (including NSW-only records if NSW is main), and every other state's core set.

**Tests.** Existing tests that pin NSW phone numbers and sources become per-state fixtures, with the selected state's fixtures checked in each build. A separate test checks every state: all seven roles present (or a documented, test-listed exception), HTTPS official URLs, valid phone format, valid reviewed date, and no resource ID collisions. A test builds with a non-NSW state and checks that no NSW-sourced agency name appears outside the bottom section.

**Documentation.** README and `MAINTAINING.md` get a "switch your state" guide with the steps: edit `data/site.json`, rebuild, check, regenerate checksums, deploy. `MAINTAINING.md` also gains the field rules for `role` and the per-state files.

## Research

For each of the seven other states and territories, find the core services from the government's own websites. Record, per service: name, official HTTPS URL, phone numbers with hours where stated, the date checked, and a note of what page confirmed it. Evidence goes in `research/` (one file per state, in the style of the existing `primary-source-notes.json`). If a state has no service for a role, or the source blocks automated checks, say so in the notes and in `research/manual-verification.json` instead of guessing. Reuse national resources where they already cover the need (Lifeline, 000, healthdirect).

## Left to the builder

- Exact file layout and field names for state data, as long as it follows the decisions above.
- Final role-to-page mapping for the bottom section.
- How to present a state that lacks a core service (a note on the card, or leaving the role out).
- Order of work, and how to split the research.
- The bottom section's visual styling, within the existing theme.

## Thin pages (decided by the owner, 2026-10-17)

Every page and route exists in every build. Where a page is mostly NSW-only today (`animals`, `accessible-help`, `bird-flu`, and parts of `bushfire`, `prepare`, `recovery`), a non-NSW build keeps the page with its national cards and any state cards that exist. It also shows a short note that no state-specific services are listed on that page, linking to the "Other states and territories" section. Navigation, `docs/meta.ts`, route tests, sitemap and cross-links are the same for every state. The generator needs no conditional pages.

## Calls made after the builder check

- **Testing other states.** The generator takes a test-only `--state` flag and an output directory, so tests can build any state into a temp location without touching the committed `data/site.json`, `docs/`, `public/resources.json` or `SHA256SUMS.json`. CI runs the committed state in full (build, content, browser tests) plus a generation-only check for all eight states and the cross-state data test.
- **Vocabulary.** Placeholders cover only the seven core agency names plus the state's name. Any sentence that mentions a term outside that (Get Ready NSW, MyFirePlan, RFS fire danger ratings, NSW Health's respiratory guidance) belongs to an NSW-only block. The build fails with a clear error if a placeholder has no value for the chosen state.
- **Borderline records.** `tis` (TIS National) becomes a national record, and its NSW mental-health-line pathway note moves into an NSW-only block. MyFirePlan stays NSW-only. As part of the NSW migration, every existing `Australia` record is audited for NSW wording or NSW-sourced claims, and any found are moved into NSW blocks. Records tagged `Australia` are not assumed neutral.
- **NSW baseline.** "Same as today plus the bottom section" is the standard, not byte-identical. The NSW build's `docs/*.mdx` are diffed before and after the migration, and the only differences allowed are the new bottom section, the thin-page notes (which do not appear in NSW), and counts in the README and descriptions.

## My calls (please check these)

- Setting lives in `data/site.json`, not an environment variable.
- NSW-sourced prose is not rewritten for other states. Per-state blocks are written only from that state's own source.
- The sources page shows everything on the site, so NSW-only records vanish from it when another state is main.
- The role-to-page mapping above is a first guess.
