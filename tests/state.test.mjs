import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STATE_CODES, ROLES, loadSite, assertState, loadStates, loadRegister, visibleResources, roleRecord } from '../scripts/lib/register.mjs';
const register=loadRegister();
const ids=list=>list.map(r=>r.id);
test('assertState rejects bad codes',()=>{for(const bad of ['nsw','','Victoria'])assert.throws(()=>assertState(bad),new RegExp(`Unknown MAIN_STATE "${bad}"\\. Valid: NSW, VIC`));assert.doesNotThrow(()=>assertState('QLD'));});
test('NSW core roles are mapped',()=>{const expected={ses:'ses',fire:'rfs',warnings:'hazardwatch',police:'police',health:'nsw-infectious',mentalHealth:'mental-health',recovery:'service-nsw'};assert.deepEqual(Object.keys(expected),ROLES);for(const role of ROLES)assert.equal(roleRecord(register,'NSW',role)?.id,expected[role],role);});
test('visibleResources hides NSW-only records for another state',()=>{const qld=ids(visibleResources(register,'QLD'));for(const id of ['pets','traffic'])assert.ok(!qld.includes(id),id);for(const id of ['ses','triple-zero','birdflu'])assert.ok(qld.includes(id),id);assert.ok(ids(visibleResources(register,'NSW')).includes('pets'));});
test('register IDs are unique and every jurisdiction is valid',()=>{assert.equal(new Set(ids(register)).size,register.length);for(const r of register)assert.ok(['Australia',...STATE_CODES].includes(r.jurisdiction),`${r.id}: ${r.jurisdiction}`);});
test('data/site.json mainState is a valid state with a data file',()=>{const {mainState}=loadSite();assert.doesNotThrow(()=>assertState(mainState));assert.ok(loadStates()[mainState],`data/states/${mainState}.json missing`);});
const states=loadStates();
for(const [code,state] of Object.entries(states).filter(([c])=>c!=='NSW'))test(`state file ${code} is complete and well formed`,()=>{
  for(const r of state.resources){assert.match(r.url,/^https:\/\//,r.id);assert.match(r.reviewed,/^2026-10-(14|16|1[7-9]|2\d|3[01])$/,r.id);if(r.phone)assert.match(r.phone,/^[\d ]+$/,r.id);assert.equal(r.jurisdiction,code,r.id);assert.ok(r.summary.length>25,r.id);}
  assert.equal(new Set(ids(register)).size,register.length);
  assert.deepEqual(Object.keys(state.terms).sort(),[...ROLES].sort());
  const missing=state.missingRoles??[];
  for(const role of ROLES){const covered=!!roleRecord(register,code,role),absent=missing.includes(role);assert.ok(covered||absent,`${role} neither mapped nor listed in missingRoles`);assert.ok(!(covered&&absent),`${role} both mapped and listed in missingRoles`);}
  assert.ok(!missing.includes('ses'),'ses must never be in missingRoles');
  assert.ok(fs.existsSync(`tests/fixtures/states/${code}.json`),`tests/fixtures/states/${code}.json missing`);
});

// Generator tests against the tiny, independent fixture in tests/fixtures/mini-root.
import os from 'node:os';
import path from 'node:path';
import { generate } from '../scripts/generate-content.mjs';
const miniRoot=path.resolve('tests/fixtures/mini-root');
const tmpDir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'gen-'));
const build=(state,root=miniRoot)=>generate({root,state,outDir:tmpDir()});
const copyRoot=()=>{const dir=tmpDir();fs.cpSync(miniRoot,dir,{recursive:true});return dir;};
const editJson=(file,fn)=>fs.writeFileSync(file,JSON.stringify(fn(JSON.parse(fs.readFileSync(file,'utf8')))));
const BOTTOM='## Other states and territories';
test('loadRegister rejects duplicate ids across files',()=>{const dir=copyRoot();editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,resources:[...s.resources,{...s.resources[0],id:'ses'}]}));assert.throws(()=>loadRegister(dir),/Duplicate resource id "ses"/);});
test('generator: unknown state throws',()=>{assert.throws(()=>build('qld'),/Unknown MAIN_STATE "qld"\. Valid: NSW, VIC/);});
test('generator: state defaults to site.json and writes to outDir',()=>{const out=tmpDir(),files=generate({root:miniRoot,outDir:out});assert.ok(files.get('docs/local.mdx').includes('id="resource-ses"'));assert.equal(fs.readFileSync(path.join(out,'docs/local.mdx'),'utf8'),files.get('docs/local.mdx'));});
test('generator: role token resolves to the main state record',()=>{assert.ok(build('NSW').get('docs/local.mdx').includes('id="resource-ses"'));const qld=build('QLD').get('docs/local.mdx');assert.ok(qld.includes('id="resource-qld-ses"'));assert.ok(!qld.includes('resource-ses"'));});
test('generator: records of other states are skipped in resource lists',()=>{const qld=build('QLD').get('docs/local.mdx');assert.ok(!qld.includes('resource-pets'));assert.ok(!qld.includes('NSW Pets'));assert.equal(qld.match(/className="resource-list"/g).length,1);const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'bad',title:'Bad',description:'Bad',body:'{{resources:nope}}'}]);assert.throws(()=>build('QLD',dir),/Unknown resource: nope/);});
test('generator: missing role throws unless listed in missingRoles',()=>{const qld=build('QLD').get('docs/local.mdx');assert.ok(!qld.includes('resource-rfs'));const dir=copyRoot();editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,missingRoles:s.missingRoles.filter(r=>r!=='fire')}));assert.throws(()=>build('QLD',dir),e=>/local/.test(e.message)&&/role:fire/.test(e.message)&&/QLD/.test(e.message));const dir2=copyRoot();editJson(path.join(dir2,'data/pages.json'),p=>[...p,{slug:'prose',title:'P',description:'P',body:'Call {{phone:fire}}'}]);assert.throws(()=>build('QLD',dir2),e=>/prose/.test(e.message)&&/phone:fire/.test(e.message)&&/QLD/.test(e.message));});
test('generator: placeholders fill title, description and body',()=>{const nsw=build('NSW').get('docs/local.mdx'),qld=build('QLD').get('docs/local.mdx');assert.ok(nsw.startsWith('---\ntitle: "NSW help"\ndescription: "Help in New South Wales"\n---'));assert.ok(qld.startsWith('---\ntitle: "QLD help"\ndescription: "Help in Queensland"\n---'));assert.ok(qld.includes('Call Queensland SES on 132 500 (tel:132500).'));assert.ok(!/\{\{/.test(nsw+qld));});
test('generator: state block renders only for its state',()=>{assert.ok(build('NSW').get('docs/local.mdx').includes('NSW-only sourced text.'));assert.ok(!build('QLD').get('docs/local.mdx').includes('NSW-only sourced text.'));});
test('generator: thin note',()=>{const note=s=>`No ${s}-specific services are listed on this page. See [other states and territories](#other-states-and-territories) for the same kinds of service elsewhere.`;const nsw=build('NSW'),qld=build('QLD');assert.equal(qld.get('docs/animals.mdx').split(note('QLD')).length,2);for(const page of ['plain','local'])assert.ok(!qld.get(`docs/${page}.mdx`).includes('specific services are listed'),page);for(const page of ['plain','local','animals'])assert.ok(!nsw.get(`docs/${page}.mdx`).includes('specific services are listed'),page);});
test('generator: bottom section',()=>{const nsw=build('NSW'),qld=build('QLD');const section=t=>t.slice(t.indexOf(BOTTOM));assert.equal(section(nsw.get('docs/local.mdx')),`${BOTTOM}\n\n- **QLD** — State emergency service: [Queensland SES](https://example.qld.gov.au/ses) — [132 500](tel:132500)\n`);assert.equal(section(qld.get('docs/local.mdx')),`${BOTTOM}\n\n- **NSW** — State emergency service: [NSW SES](https://example.nsw.gov.au/ses) — [132 500](tel:132500)\n- **NSW** — Fire and rescue: [NSW RFS](https://example.nsw.gov.au/rfs)\n`);for(const [state,files] of [['NSW',nsw],['QLD',qld]]){for(const page of ['animals','plain'])assert.ok(!files.get(`docs/${page}.mdx`).includes(BOTTOM),`${state} ${page}`);for(const text of files.values())assert.ok(!text.includes('tel:106'),state);}const qldAnimals=qld.get('docs/animals.mdx');assert.ok(qldAnimals.indexOf('specific services are listed')>qldAnimals.indexOf('Intro.'));});
test('generator: --check passes on an unchanged tree and fails on drift',()=>{const out=tmpDir();generate({root:miniRoot,state:'QLD',outDir:out});assert.doesNotThrow(()=>generate({root:miniRoot,state:'QLD',outDir:out,check:true}));fs.appendFileSync(path.join(out,'docs/plain.mdx'),'x');assert.throws(()=>generate({root:miniRoot,state:'QLD',outDir:out,check:true}),/Generated file drift: docs\/plain\.mdx/);});
test('generator: public/resources.json equals visibleResources for the state',()=>{const reg=loadRegister(miniRoot);for(const state of ['NSW','QLD'])assert.deepEqual(JSON.parse(build(state).get('public/resources.json')),visibleResources(reg,state));});
