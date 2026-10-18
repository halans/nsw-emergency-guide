# Main-state flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One committed setting, `mainState` in `data/site.json`, turns the whole site into an NSW, VIC, QLD, WA, SA, TAS, ACT or NT build, with the other states' core services listed at the bottom of each page.

**Architecture:** `scripts/generate-content.mjs` stays the single data-to-MDX step. A new shared module, `scripts/lib/register.mjs`, loads the register (`data/resources.json` for national and NSW records, plus `data/states/<CODE>.json` for the other seven states), filters it to what is visible for the main state, and resolves placeholders. Page templates keep their `{{resources:...}}` tokens and gain `role:` tokens, `{{state}}`-style placeholders, per-state prose blocks, and a generated "Other states and territories" section.

**Tech Stack:** Node >= 22.19 ESM (`.mjs`), `node:test`, Playwright, Blume 2.2.3. No new dependencies.

**Spec:** `design/superpowers/specs/2026-10-17-main-state-design.md`

## Global Constraints

- Content flows `data/*.json` to `scripts/generate-content.mjs` to `docs/*.mdx` and `public/resources.json`. Never hand-edit the generated files; a test fails on drift.
- The state setting lives in a committed data file (`data/site.json`), not an environment variable. `SITE_URL` stays an environment variable.
- Valid `mainState` values: NSW, VIC, QLD, WA, SA, TAS, ACT, NT. Default NSW. An unknown value fails the build with a clear error.
- Core set per state: state emergency service, fire and rescue authority, official warnings and incidents site, police non-emergency number, state health department (with its public health or infectious disease page), state mental-health crisis line, state recovery and disaster-assistance page.
- NSW resources with no core equivalent (pets, assistance animals, traffic, legal aid, evacuation centres and similar) show only when NSW is the main state.
- Every record needs an official HTTPS `url`, verified phone numbers, a `reviewed` date, and evidence in `research/`. Never guess or recall a number or URL; unverifiable items go in `research/manual-verification.json` and the state's `missingRoles`.
- Phone links are `tel:` with spaces stripped, except the `relay` record (106, TTY/TDD only), which stays plain text.
- No live data (incident counts, outbreak totals, warning levels, evacuation-centre status). The `warnings` page must still say no live warnings are reproduced.
- Agent-facing Markdown must stay free of JSX. Raw HTML is wrapped in `<Visibility for="web">` with a plain-Markdown twin, and the agents-only twin has no headings.
- No remote scripts, stylesheets or fonts in built HTML. Do not add `public/_headers`.
- The NSW build must equal today's output plus the new bottom section. The only other allowed differences are the ones listed in Task 3.
- After intentional changes, `npm run checksums` refreshes `SHA256SUMS.json`. Do not upgrade dependencies. Do not invent a `SITE_URL`.
- Commit steps below run only after the owner has said commits are authorised. Until then, stage nothing and skip them.

## Review Focus

1. An unknown or wrongly cased `mainState` (`"nsw"`, `"Victoria"`, empty): the build fails and the message lists the valid codes. It never falls back to NSW.
2. A placeholder or `role:` token with no value for the chosen state: the build fails naming the page, the token and the state, unless the role is in that state's `missingRoles`, in which case the card is skipped.
3. An agency that fills several roles (for example ACT's Emergency Services Agency): its record appears once per page in the bottom section, and there are no duplicate resource IDs or duplicate card anchors.
4. A QLD (or any non-NSW) build: the strings `NSW`, `New South Wales`, `Service NSW` and `RFS` appear nowhere outside the bottom section. That covers page text, frontmatter titles and descriptions, `public/resources.json` and the sources page.
5. A page where the main state has no content (no state records, no state block): the thin-page note appears once; pages not flagged for it never show it.

---

### Task 1: Register library, site setting and NSW migration

**Files:**
- Create: `scripts/lib/register.mjs`, `data/site.json`, `data/states/NSW.json`, `tests/state.test.mjs`
- Modify: `data/resources.json` (NSW records get `roles`; `tis` becomes `jurisdiction: "NSW"`)

**Interfaces:**
- Produces, from `scripts/lib/register.mjs` (all take an optional `root` defaulting to the repo root):
  - `STATE_CODES: string[]` = `['NSW','VIC','QLD','WA','SA','TAS','ACT','NT']`
  - `ROLES: string[]` = `['ses','fire','warnings','police','health','mentalHealth','recovery']`
  - `ROLE_LABELS: Record<string,string>`: ses "State emergency service", fire "Fire and rescue", warnings "Warnings and incidents", police "Police assistance (non-emergency)", health "Health department", mentalHealth "Mental-health crisis line", recovery "Recovery and disaster assistance"
  - `loadSite(root?): { mainState: string }`
  - `assertState(code: string): void`: throws `Unknown MAIN_STATE "<code>". Valid: NSW, VIC, ...`
  - `loadStates(root?): Record<string, { name: string, longName: string, terms: Record<string,string>, missingRoles?: string[], resources: Resource[] }>`: only states with a file in `data/states/`
  - `loadRegister(root?): Resource[]`: `data/resources.json` first, then each state file's `resources` in `STATE_CODES` order; throws on duplicate IDs
  - `visibleResources(register, mainState): Resource[]`: keeps a record if `jurisdiction === 'Australia'`, or `=== mainState`, or it has a non-empty `roles` array
  - `roleRecord(register, state, role): Resource | undefined`: the first record with `jurisdiction === state` and `roles.includes(role)`
- Resource gains an optional `roles: string[]`. `jurisdiction` is `Australia` or a state code.

- [ ] **Step 1: Write failing tests in `tests/state.test.mjs`** (uses `node:test` and `assert/strict`, importing the library):
  - `assertState rejects bad codes`: `assert.throws(()=>assertState('nsw'),/Unknown MAIN_STATE "nsw"\. Valid: NSW, VIC/)`, and the same for `''` and `'Victoria'`; `assertState('QLD')` does not throw.
  - `NSW core roles are mapped`: for every role in `ROLES`, `roleRecord(loadRegister(),'NSW',role)` exists, with these IDs: ses→`ses`, fire→`rfs`, warnings→`hazardwatch`, police→`police`, health→`nsw-infectious`, mentalHealth→`mental-health`, recovery→`service-nsw`.
  - `visibleResources hides NSW-only records for another state`: with `mainState` `'QLD'`, the result excludes `pets` and `traffic` and includes `ses`, `triple-zero` and `birdflu`; with `'NSW'` it includes `pets`.
  - `register IDs are unique and every jurisdiction is valid`: each record's jurisdiction is in `['Australia',...STATE_CODES]`.
  - `data/site.json mainState is a valid state with a data file`.
- [ ] **Step 2: Run** `node --test tests/state.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement the library, `data/site.json` (`{"mainState":"NSW"}`) and `data/states/NSW.json`.** `name` is `"NSW"`, `longName` is `"New South Wales"`, `resources` is `[]` (NSW records stay in `data/resources.json` to keep the register order and the NSW baseline). `terms` are exactly the strings used on the site today: ses "NSW SES", fire "NSW RFS", warnings "HazardWatch", police "NSW Police", health "NSW Health", mentalHealth "NSW Mental Health Line", recovery "Service NSW".
- [ ] **Step 4: Migrate `data/resources.json`.** Add `roles` to the seven records named in Step 1. Change `tis` to `jurisdiction: "NSW"`, because its name, URL and summary are entirely the NSW Mental Health Line pathway. This deliberately departs from the spec's "tis becomes national"; flag it to the owner at the end. A grep confirms `tis` is the only non-NSW record containing NSW wording, so there is nothing else to move.
- [ ] **Step 5: Run** `node --test tests/state.test.mjs`. Expected: PASS.
- [ ] **Step 6: Commit** (once authorised): `feat: add state register library and NSW role mapping`.

---

### Task 2: Generator: CLI, placeholders, role tokens, state blocks, bottom section

**Files:**
- Modify: `scripts/generate-content.mjs`
- Create: `tests/fixtures/mini-root/` (small `data/site.json`, `data/resources.json`, `data/states/NSW.json`, `data/states/QLD.json`, `data/pages.json` with one flagged page and one unflagged page), extend `tests/state.test.mjs`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `generate(opts?: { root?: string, state?: string, outDir?: string, check?: boolean }): Map<string,string>`. It no longer runs on import; it runs only when the file is the entry point. `state` defaults to `loadSite(root).mainState`. `outDir` defaults to `root` (files are written relative to it). `--state XX`, `--out DIR` and `--check` are the matching CLI flags.
- Pages in `data/pages.json` gain optional fields: `roles: string[]` (roles listed in the bottom section), `stateBlocks: Record<key, Record<code, markdownString>>`, `stateNote: boolean`.
- Template syntax:
  - `{{state}}` and `{{state-long}}`: the state's `name` and `longName`.
  - `{{term:<role>}}`: `terms[role]`.
  - `{{phone:<role>}}` and `{{tel:<role>}}`: the role record's display phone (`phoneLabel` is not used) and its digits-only form.
  - `{{state-block:<key>}}`: `stateBlocks[key][state]`, or nothing.
  - In `{{resources:a,b}}`, an id may be `role:<role>`, resolved with `roleRecord`.
  - Placeholders work in a page's `title`, `description` and `body`.

- [ ] **Step 1: Write failing tests against the mini fixture** (each calls `generate({root: miniRoot, state, outDir: tmp})` with a temp dir from `fs.mkdtempSync`):
  - `unknown state throws`: `state: 'qld'` rejects with the Task 1 message.
  - `role token resolves to the main state's record`: the NSW build contains `id="resource-ses"` and the QLD build contains `id="resource-qld-ses"` and not `resource-ses"`.
  - `records of other states are skipped in resource lists`: a token naming an NSW-only id renders nothing in the QLD build, and unknown ids still throw `Unknown resource`.
  - `missing role throws unless listed in missingRoles`: the error names page, token and state; add the role to the fixture state's `missingRoles` and the build succeeds and skips the card.
  - `state block renders only for its state`, and `placeholders fill title and description`.
  - `thin note`: a flagged page with no QLD content contains the note once, the unflagged page never does, and the NSW build never shows it on the flagged page when NSW content exists.
  - `bottom section`: `## Other states and territories` lists the other state's role records for `page.roles` as a plain Markdown list (`- **<name>** — [<record name>](<url>) — [<phone>](tel:<digits>)`), no JSX, no duplicate record on a page, and the section is absent when no other state has a record for those roles. The 106 relay record is never rendered as a link.
  - `--check` mode: passes against an unchanged tree and throws `Generated file drift` when a file differs.
  - `public/resources.json` equals `visibleResources` for the chosen state.
- [ ] **Step 2: Run** `node --test tests/state.test.mjs`. Expected: new tests FAIL.
- [ ] **Step 3: Implement.** Refactor the existing top-level code into `generate(opts)` without changing card or Markdown-twin output. Expansion order per page: state blocks, then simple placeholders, then resource tokens. Count main-state content (rendered records with `jurisdiction === state`, plus non-empty state blocks) to decide the thin note, which is appended just before the bottom section. `{{all-resources}}` uses `visibleResources`. The bottom section is appended after the body and is ordinary Markdown (no `<Visibility>`).
- [ ] **Step 4: Run** `node --test tests/state.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** (once authorised): `feat: state-aware content generator`.

---

### Task 3: Migrate page templates to placeholders, role tokens and NSW blocks

**Files:**
- Modify: `data/pages.json`, `docs/*.mdx` and `public/resources.json` (regenerated, never hand-edited)

**Interfaces:**
- Consumes: the Task 2 template syntax.
- Produces: a page set whose NSW output equals today's, apart from the allowed diffs below.

Decisions:
- Role tokens replace NSW core ids, in the same list positions: `ses`→`role:ses`, `police`→`role:police`, `rfs`→`role:fire`, `hazardwatch`→`role:warnings`, `mental-health`→`role:mentalHealth`, `service-nsw`→`role:recovery`. A health card for the `health` role (`role:health`) replaces `nsw-infectious` on the health page. NSW-only ids stay as they are, since the visible filter skips them in other builds.
- `roles` for the bottom section: urgent-help `[ses, police]`, warnings `[warnings, ses]`, bushfire `[fire]`, health `[health]`, crisis-support `[mentalHealth]`, recovery `[recovery]`, prepare `[ses, fire]`. Other pages have none.
- `stateNote: true` on every page that has main-state content in the NSW build (all except `bird-flu`, `sources` and `about`).
- Prose that states an NSW-sourced fact moves into `stateBlocks` under `NSW`: the warnings page's warning-levels paragraph and `Get Ready NSW` sentence; the bushfire MyFirePlan and RFS-ratings sentences; the health page's NSW Health respiratory paragraph and the NSW Health closing sentence; the crisis-support TIS sentence; the prepare page's Get Ready NSW paragraph and SES during-emergency link; the accessible-help TIS paragraph; the recovery Service NSW sentence; the sources page's "MyFirePlan, NSW RFS, HazardWatch and birdflu.gov.au are included explicitly" sentence. Wording shared by all states uses `{{state}}`, `{{term:*}}`, `{{phone:*}}` and `{{tel:*}}`. The NSW heading "Start with the NSW RFS" becomes "Start with {{term:fire}}"; the index heading "Four useful starting points" becomes "Useful starting points".
- Allowed differences in the NSW build: the headings just named, new `## Other states and territories` sections, and nothing else.

- [ ] **Step 1: Edit `data/pages.json`** as decided above.
- [ ] **Step 2: Regenerate** with `node scripts/generate-content.mjs`, then run `git diff --stat docs public`. Expected: every changed `docs/*.mdx` hunk is one of the allowed differences. Inspect the full diff for `index`, `urgent-help`, `warnings`, `bushfire`, `health` and `recovery`. Anything else is a bug in the templates; fix and repeat.
- [ ] **Step 3: Run** `node scripts/generate-content.mjs --check`, then `npm run build` and `npm test`. Expected: PASS apart from the content tests that Task 5 updates (note which).
- [ ] **Step 4: Commit** (once authorised): `refactor: state-neutral page templates with NSW blocks`.

---

### Task 4: Research and data for one state or territory (run once per row below, in parallel)

Rows (leads only; every name, number and URL must be checked against the official source): 

| Code | Name | Agencies to start from |
|---|---|---|
| VIC | Victoria | VICSES, Country Fire Authority and Fire Rescue Victoria, VicEmergency, Victoria Police, Department of Health, mental-health crisis line, Emergency Recovery Victoria |
| QLD | Queensland | SES Queensland, Queensland Fire Department, Queensland Disaster Hub, Queensland Police, Queensland Health, Mental Health Access Line, Queensland Government disaster recovery |
| WA | Western Australia | WA SES, DFES, Emergency WA, WA Police, WA Health, Mental Health Emergency Response Line, WA recovery pages |
| SA | South Australia | SA SES, CFS and MFS, SA Police, SA Health, Mental Health Triage Service, SA recovery pages |
| TAS | Tasmania | Tasmania SES, Tasmania Fire Service, TasALERT, Tasmania Police, Department of Health, Mental Health Services Helpline, Tasmania recovery pages |
| ACT | Australian Capital Territory | ACT Emergency Services Agency (several roles), ACT Policing, ACT Health, Mental Health Triage Service, Access Canberra recovery pages |
| NT | Northern Territory | NT Emergency Service, Bushfires NT, NT Police Fire and Emergency Services, NT Health, NT mental-health line, NT recovery pages |

**Files (per state `<CODE>`):**
- Create: `data/states/<CODE>.json`, `research/states/<CODE>.json`, `tests/fixtures/states/<CODE>.json`

**Interfaces:**
- Consumes: Task 1 library shape. Produces `data/states/<CODE>.json`: `{ name, longName, terms: {<seven roles>: string}, missingRoles?: string[], resources: Resource[] }`.
- Resource ids are `<code-lowercase>-<slug>` (for example `qld-ses`), `jurisdiction` is the state code, and each carries `roles`. A combined agency has one record with several roles. `reviewed` is the date the record was verified (not before `2026-10-17`). `phone`, `phoneLabel` and `hours` appear only if the official page states them.
- `research/states/<CODE>.json`: one entry per record with `id`, `url`, `checked` (ISO date), `method`, and `observed` (what the page said, in your own words, with no copied live data), in the style of `research/primary-source-notes.json`.
- `tests/fixtures/states/<CODE>.json`: `{ "phones": { "<id>": "<digits and spaces>" }, "requiredUrls": ["<official URL>"] }` for every record with a phone, and one URL per role.

- [ ] **Step 1: Run** `node --test tests/state.test.mjs`. Expected: the per-state data tests added in Task 5 FAIL for this state because its files do not exist yet. If Task 5's tests are not written yet, write the Task 1 `data/site.json` check for this state's file instead and expect it to fail the same way.
- [ ] **Step 2: Research each of the seven roles from government sources only** (the state's own `.gov.au` sites). For each role, record the official name, URL and phone. If a state has no such service, or a site blocks automated access, list the role in `missingRoles` and record it in `research/manual-verification.json` (never describe it as closed).
- [ ] **Step 3: Write the data file, research file and fixture.** Reuse national records (Lifeline, healthdirect, 000) instead of duplicating them. Fill `terms` with the short agency names as the agency itself writes them.
- [ ] **Step 4: Run** `node --test tests/state.test.mjs`. Expected: PASS for this state.
- [ ] **Step 5: Commit** (once authorised): `feat: add <CODE> core emergency services`.

---

### Task 5: Cross-state tests and content-test updates

**Files:**
- Modify: `tests/content.test.mjs`, `tests/state.test.mjs`, `package.json` (add `"test:states": "node --test tests/state.test.mjs"` and include it in `npm test`)

**Interfaces:**
- Consumes: Tasks 1 to 4.

- [ ] **Step 1: Write failing tests in `tests/state.test.mjs`** (they need all eight state files, so they run after Task 4):
  - `every state has a data file and fixture`, for each of `STATE_CODES`.
  - `every state covers all seven roles or lists the gap`: each role has a record from `roleRecord`, or is in that state's `missingRoles` (and the role is not also present).
  - `every state record is valid`: HTTPS `url`; `reviewed` matches `/^2026-10-(14|16|1[7-9]|2\d|3[01])$/`; `phone` matches `/^[\d ]+$/` when present; `jurisdiction` equals the file's state; no duplicate IDs; `terms` has all seven roles.
  - `state fixtures match data`: each phone fixture equals the record's phone, and each `requiredUrls` entry is in the register.
  - `all eight states generate`: `generate({ state, outDir: tmp })` succeeds for every code.
  - `non-main states leave no trace`: for every non-NSW state, generate into a temp dir, strip each `## Other states and territories` section from `docs/*.mdx`, then assert none of the generated `docs/*.mdx` or `public/resources.json` contains `NSW`, `New South Wales`, `Service NSW` or `RFS` (case-sensitive), including frontmatter. Similar checks for each other main state against its own earlier trace are not needed.
  - `106 stays plain text` in every build: no `tel:106` in any output.
- [ ] **Step 2: Update `tests/content.test.mjs`.**
  - Load the register with `loadRegister()` and use `visibleResources(register, loadSite().mainState)` wherever the tests compare against the built site (`resources`, the sources-page test, the `dist/resources.json` deepEqual).
  - Jurisdiction allow-list becomes `['Australia', ...STATE_CODES]`; the reviewed regex is widened as above.
  - The NSW phone and required-source fixtures move to `tests/fixtures/states/NSW.json`; the content test reads the fixture for the main state. Nationwide fixtures (`triple-zero`, `poisons`, `healthdirect`, `lifeline`, `respect`, `kids`, `birdflu`) stay inline. The `ses` and `mental-health` ids are looked up via `roleRecord` for the main state.
  - The four-sources test uses `birdflu.gov.au` plus the main state's `requiredUrls`.
  - Health-page assertions that name NSW ids (`nsw-respiratory`, `nsw-immunisation`, `nsw-infectious`, `nsw-phu`) apply only when the main state is NSW.
- [ ] **Step 3: Create `tests/fixtures/states/NSW.json`** from the pinned values currently in the test (`ses`, `police`, `mental-health`, `nsw-phu` phones; the NSW RFS, HazardWatch and MyFirePlan URLs).
- [ ] **Step 4: Run** `npm run build && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** (once authorised): `test: cross-state data and non-main-state checks`.

---

### Task 6: Config, docs, browser test, checksums and full verification

**Files:**
- Modify: `blume.config.ts`, `README.md`, `MAINTAINING.md`, `CLAUDE.md`, `DEPLOY.md` (only if it names NSW), `tests/browser/site.spec.mjs`, `SHA256SUMS.json`, `data/pages.json` (the `about` page)

- [ ] **Step 1: Add a browser test** in `tests/browser/site.spec.mjs` named `other states section is present`: on `/health`, `/bushfire` and `/urgent-help`, the heading `Other states and territories` is visible and its list holds at least one external link. Add `/` to nothing else; the route list is unchanged. Run `npx playwright test -g "other states section"`. Expected: PASS (the section exists from Tasks 2 and 4); if it fails, fix the generator, not the test.
- [ ] **Step 2: `blume.config.ts`.** Read `data/site.json` and `data/states/<state>.json` with `node:fs`; `description` becomes `An independent guide to official Australian and ${name} emergency contacts, warnings, preparation and recovery resources.` For NSW the string is identical to today's. Throw on an invalid state with the Task 1 message.
- [ ] **Step 3: Docs.**
  - README: counts and wording (no longer "39 resources across 13 pages"; state the national and per-state counts after Task 4), plus a "Switch your state" section: edit `data/site.json`, run `npm run build`, `npm test`, `npm run test:browser`, `npm run checksums`, deploy; mention `node scripts/generate-content.mjs --state QLD --out <dir>` for a trial build.
  - `MAINTAINING.md`: the `roles` and `missingRoles` fields, the `data/states/<CODE>.json` shape, the fixtures and research files, and the `jurisdiction` values (`Australia` or a state code).
  - `CLAUDE.md`: update the architecture and conventions paragraphs for the setting, per-state files, `role:` tokens and the non-main-state test.
  - `about` page template: "Australian national contacts and {{state}} emergency resources" and one sentence that every page ends with core services for other states and territories.
- [ ] **Step 4: Verify NSW.** `npm run build && npm test && npm run validate && npm run doctor && npm run test:browser`. Expected: all PASS; `git diff docs` shows only the allowed differences plus the bottom sections.
- [ ] **Step 5: Verify a non-NSW build end to end.** Temporarily set `data/site.json` to `{"mainState":"QLD"}`; run `npm run build && npm test && npm run test:browser`; open `dist/urgent-help/index.html` and `dist/bushfire/index.html` and confirm Queensland records lead and NSW appears only in the bottom section. Restore `data/site.json` to NSW, rebuild, and confirm `git status` shows no stray changes. Repeat for one territory (ACT) because of its combined agency.
- [ ] **Step 6: `npm run checksums`, then `npm run verify:files`.** Expected: PASS. Record any known-failing item honestly in the final report.
- [ ] **Step 7: Commit** (once authorised): `feat: main-state flag and switch-your-state guide`.
