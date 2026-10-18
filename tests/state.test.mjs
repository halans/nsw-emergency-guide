import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STATE_CODES, ROLES, ROLE_LABELS, loadSite, assertState, loadStates, loadRegister, visibleResources, roleRecord } from '../scripts/lib/register.mjs';
const register=loadRegister();
const ids=list=>list.map(r=>r.id);
test('assertState rejects bad codes',()=>{for(const bad of ['nsw','','Victoria'])assert.throws(()=>assertState(bad),new RegExp(`Unknown main state "${bad}" \\(set mainState in data/site\\.json, or pass --state\\)\\. Valid: NSW, VIC, QLD, WA, SA, TAS, ACT, NT$`));assert.doesNotThrow(()=>assertState('QLD'));});
test('NSW core roles are mapped',()=>{const expected={ses:'ses',fire:'rfs',warnings:'hazardwatch',police:'police',health:'nsw-infectious',mentalHealth:'mental-health',recovery:'service-nsw'};assert.deepEqual(Object.keys(expected),ROLES);for(const role of ROLES)assert.equal(roleRecord(register,'NSW',role)?.id,expected[role],role);});
test('visibleResources hides NSW-only records for another state',()=>{const qld=ids(visibleResources(register,'QLD'));for(const id of ['pets','traffic'])assert.ok(!qld.includes(id),id);for(const id of ['ses','triple-zero','birdflu'])assert.ok(qld.includes(id),id);assert.ok(ids(visibleResources(register,'NSW')).includes('pets'));});
test('register IDs are unique and every jurisdiction is valid',()=>{assert.equal(new Set(ids(register)).size,register.length);for(const r of register)assert.ok(['Australia',...STATE_CODES].includes(r.jurisdiction),`${r.id}: ${r.jurisdiction}`);});
test('data/site.json mainState is a valid state with a data file',()=>{const {mainState}=loadSite();assert.doesNotThrow(()=>assertState(mainState));assert.ok(loadStates()[mainState],`data/states/${mainState}.json missing`);});
const states=loadStates();
const REVIEWED=/^2026-10-(14|16|1[7-9]|2\d|3[01])$/;
const fixture=code=>JSON.parse(fs.readFileSync(`tests/fixtures/states/${code}.json`,'utf8'));
const nonEmpty=v=>typeof v==='string'&&v.trim().length>0;
test('every state has a data file and fixture',()=>{for(const code of STATE_CODES){assert.ok(states[code],`data/states/${code}.json missing`);assert.ok(fs.existsSync(`tests/fixtures/states/${code}.json`),`tests/fixtures/states/${code}.json missing`);const f=fixture(code);assert.ok(f.phones&&typeof f.phones==='object'&&Object.keys(f.phones).length>0,`${code} fixture needs phones`);assert.ok(Array.isArray(f.requiredUrls)&&f.requiredUrls.length>0,`${code} fixture needs requiredUrls`);}});
// Per state: every record of that jurisdiction (NSW's live in data/resources.json, the others in their own file) is valid, and all seven roles are covered or listed as a gap.
for(const code of STATE_CODES)test(`state ${code} is complete and well formed`,()=>{
  const state=states[code],own=register.filter(r=>r.jurisdiction===code);
  assert.ok(own.length>0,`no records for ${code}`);
  for(const r of own){assert.match(r.url,/^https:\/\//,r.id);assert.match(r.reviewed,REVIEWED,r.id);if(r.phone)assert.match(r.phone,/^[\d ]+$/,r.id);assert.equal(r.jurisdiction,code,r.id);assert.ok(r.summary.length>25,r.id);}
  for(const r of state.resources)assert.equal(r.jurisdiction,code,`${r.id} sits in data/states/${code}.json`);
  assert.equal(new Set(ids(register)).size,register.length,'duplicate ids');
  assert.ok(nonEmpty(state.name),'name');assert.ok(nonEmpty(state.longName),'longName');
  assert.deepEqual(Object.keys(state.terms).sort(),[...ROLES].sort());
  for(const [role,term] of Object.entries(state.terms))assert.ok(nonEmpty(term),`terms.${role} must be a non-empty string`);
  const missing=state.missingRoles??[];
  for(const role of missing)assert.ok(ROLES.includes(role),`missingRoles has unknown role "${role}"`);
  for(const role of ROLES){const covered=!!roleRecord(register,code,role),absent=missing.includes(role);assert.ok(covered||absent,`${role} neither mapped nor listed in missingRoles`);assert.ok(!(covered&&absent),`${role} both mapped and listed in missingRoles`);}
  assert.ok(!missing.includes('ses'),'ses must never be in missingRoles');
});
test('state fixtures match data',()=>{for(const code of STATE_CODES){const f=fixture(code);for(const [id,phone] of Object.entries(f.phones)){const r=register.find(x=>x.id===id);assert.ok(r,`${code} fixture: unknown record ${id}`);assert.equal(r.jurisdiction,code,`${code} fixture: ${id} belongs to ${r.jurisdiction}`);assert.equal(r.phone,phone,`${code} fixture: ${id}`);}for(const url of f.requiredUrls)assert.ok(register.some(r=>r.url===url&&(r.jurisdiction===code||r.jurisdiction==='Australia')),`${code} fixture: ${url} is not in a ${code} or Australia record`);}});

// Generator tests against the tiny, independent fixture in tests/fixtures/mini-root.
import os from 'node:os';
import path from 'node:path';
import { generate } from '../scripts/generate-content.mjs';
import { spawnSync } from 'node:child_process';
const miniRoot=path.resolve('tests/fixtures/mini-root');
const tmpDir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'gen-'));
const build=(state,root=miniRoot)=>generate({root,state,outDir:tmpDir()});
const copyRoot=()=>{const dir=tmpDir();fs.cpSync(miniRoot,dir,{recursive:true});return dir;};
const editJson=(file,fn)=>fs.writeFileSync(file,JSON.stringify(fn(JSON.parse(fs.readFileSync(file,'utf8')))));
const BOTTOM='## Other states and territories';
const INTRO='In an emergency anywhere in Australia, call 000. These are each state\'s own services; check the official page before calling.';
const HEAD=`${BOTTOM}\n\n${INTRO}`;
test('loadRegister rejects duplicate ids across files',()=>{const dir=copyRoot();editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,resources:[...s.resources,{...s.resources[0],id:'ses'}]}));assert.throws(()=>loadRegister(dir),/Duplicate resource id "ses"/);});
test('generator: unknown state throws',()=>{assert.throws(()=>build('qld'),/Unknown main state "qld" \(set mainState in data\/site\.json, or pass --state\)\. Valid: NSW, VIC/);});
test('generator: state defaults to site.json and writes to outDir',()=>{const out=tmpDir(),files=generate({root:miniRoot,outDir:out});assert.ok(files.get('docs/local.mdx').includes('id="resource-ses"'));assert.equal(fs.readFileSync(path.join(out,'docs/local.mdx'),'utf8'),files.get('docs/local.mdx'));});
test('generator: role token resolves to the main state record',()=>{assert.ok(build('NSW').get('docs/local.mdx').includes('id="resource-ses"'));const qld=build('QLD').get('docs/local.mdx');assert.ok(qld.includes('id="resource-qld-ses"'));assert.ok(!qld.includes('resource-ses"'));});
test('generator: records of other states are skipped in resource lists',()=>{const qld=build('QLD').get('docs/local.mdx');assert.ok(!qld.includes('resource-pets'));assert.ok(!qld.includes('NSW Pets'));assert.equal(qld.match(/className="resource-list"/g).length,1);const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'bad',title:'Bad',description:'Bad',body:'{{resources:nope}}'}]);assert.throws(()=>build('QLD',dir),/Unknown resource: nope/);});
test('generator: missing role throws unless listed in missingRoles',()=>{const qld=build('QLD').get('docs/local.mdx');assert.ok(!qld.includes('resource-rfs'));const dir=copyRoot();editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,missingRoles:s.missingRoles.filter(r=>r!=='fire')}));assert.throws(()=>build('QLD',dir),e=>/local/.test(e.message)&&/role:fire/.test(e.message)&&/QLD/.test(e.message));const dir2=copyRoot();editJson(path.join(dir2,'data/pages.json'),p=>[...p,{slug:'prose',title:'P',description:'P',body:'Call {{phone:fire}}'}]);assert.throws(()=>build('QLD',dir2),e=>/prose/.test(e.message)&&/phone:fire/.test(e.message)&&/QLD/.test(e.message));});
test('generator: placeholders fill title, description and body',()=>{const nsw=build('NSW').get('docs/local.mdx'),qld=build('QLD').get('docs/local.mdx');assert.ok(nsw.startsWith('---\ntitle: "NSW help"\ndescription: "Help in New South Wales"\n---'));assert.ok(qld.startsWith('---\ntitle: "QLD help"\ndescription: "Help in Queensland"\n---'));assert.ok(qld.includes('Call Queensland SES on 132 500 (tel:132500).'));assert.ok(!/\{\{/.test(nsw+qld));});
test('generator: state block renders only for its state',()=>{assert.ok(build('NSW').get('docs/local.mdx').includes('NSW-only sourced text.'));assert.ok(!build('QLD').get('docs/local.mdx').includes('NSW-only sourced text.'));});
test('generator: other states\' role records are not cards in resource lists',()=>{const nsw=build('NSW').get('docs/fire.mdx'),qld=build('QLD').get('docs/fire.mdx');for(const id of ['ses','rfs']){assert.ok(nsw.includes(`id="resource-${id}"`),id);assert.ok(!qld.includes(`id="resource-${id}"`),id);}assert.ok(qld.includes('id="resource-nat"'));});
const SEE=' See [other states and territories](#other-states-and-territories) for the same kinds of service elsewhere.';
test('generator: thin note links to the bottom section when it is rendered',()=>{const qld=build('QLD').get('docs/fire.mdx');assert.equal(qld.split(`No QLD-specific services are listed on this page.${SEE}`).length,2);assert.ok(qld.includes(BOTTOM));assert.ok(qld.indexOf('specific services are listed')<qld.indexOf(BOTTOM));});
test('generator: thin note has no link when the bottom section is omitted',()=>{const qld=build('QLD').get('docs/animals.mdx');assert.ok(!qld.includes(BOTTOM));assert.equal(qld.split('No QLD-specific services are listed on this page.').length,2);assert.ok(!qld.includes('#other-states-and-territories'));});
test('generator: thin note only on flagged pages without main-state content',()=>{const nsw=build('NSW'),qld=build('QLD');for(const page of ['plain','local'])assert.ok(!qld.get(`docs/${page}.mdx`).includes('specific services are listed'),page);for(const page of ['plain','local','animals','fire'])assert.ok(!nsw.get(`docs/${page}.mdx`).includes('specific services are listed'),page);});
test('generator: relay phone is plain text in the bottom section',()=>{const dir=copyRoot();editJson(path.join(dir,'data/resources.json'),rs=>rs.filter(r=>r.id!=='relay'));editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,missingRoles:s.missingRoles.filter(r=>r!=='police'),resources:[...s.resources,{id:'relay',category:'Urgent',name:'QLD Relay',url:'https://example.qld.gov.au/relay',summary:'Relay record for the QLD bottom-section test.',jurisdiction:'QLD',reviewed:'2026-10-17',phone:'106',phoneLabel:'106 — TTY/TDD only',roles:['police']}]}));editJson(path.join(dir,'data/pages.json'),p=>p.map(x=>x.slug==='local'?{...x,roles:[...x.roles,'police']}:x));const text=build('NSW',dir).get('docs/local.mdx'),section=text.slice(text.indexOf(BOTTOM));assert.ok(section.includes('- **QLD** — Police assistance (non-emergency): [QLD Relay](https://example.qld.gov.au/relay) — 106\n'));assert.ok(!section.includes('tel:106'));});
test('generator: {{state}} and {{state-long}} reject a suffix',()=>{for(const token of ['{{state:ses}}','{{state-long:x}}']){const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'odd',title:'O',description:'O',body:token}]);assert.throws(()=>build('NSW',dir),e=>/odd/.test(e.message)&&e.message.includes(token));}});
test('generator CLI: flags that need a value fail clearly',()=>{for(const args of [['--state'],['--out'],['--state','--check'],['--out','--state','NSW']]){const r=spawnSync(process.execPath,['scripts/generate-content.mjs',...args,'--check'],{encoding:'utf8'});assert.notEqual(r.status,0,args.join(' '));assert.match(r.stderr,/needs a value/,args.join(' '));}});
test('generator: bottom section',()=>{const nsw=build('NSW'),qld=build('QLD');const section=t=>t.slice(t.indexOf(BOTTOM));assert.equal(section(nsw.get('docs/local.mdx')),`${HEAD}\n\n- **QLD** — State emergency service: [Queensland SES](https://example.qld.gov.au/ses) — [132 500](tel:132500)\n`);assert.equal(section(qld.get('docs/local.mdx')),`${HEAD}\n\n- **NSW** — State emergency service: [NSW SES](https://example.nsw.gov.au/ses) — [132 500](tel:132500)\n- **NSW** — Fire and rescue: [NSW RFS](https://example.nsw.gov.au/rfs)\n`);for(const [state,files] of [['NSW',nsw],['QLD',qld]]){for(const page of ['animals','plain'])assert.ok(!files.get(`docs/${page}.mdx`).includes(BOTTOM),`${state} ${page}`);for(const text of files.values())assert.ok(!text.includes('tel:106'),state);}const qldAnimals=qld.get('docs/animals.mdx');assert.ok(qldAnimals.indexOf('specific services are listed')>qldAnimals.indexOf('Intro.'));});
test('generator: --check passes on an unchanged tree and fails on drift',()=>{const out=tmpDir();generate({root:miniRoot,state:'QLD',outDir:out});assert.doesNotThrow(()=>generate({root:miniRoot,state:'QLD',outDir:out,check:true}));fs.appendFileSync(path.join(out,'docs/plain.mdx'),'x');assert.throws(()=>generate({root:miniRoot,state:'QLD',outDir:out,check:true}),/Generated file drift: docs\/plain\.mdx/);});
test('generator: public/resources.json equals visibleResources for the state',()=>{const reg=loadRegister(miniRoot);for(const state of ['NSW','QLD'])assert.deepEqual(JSON.parse(build(state).get('public/resources.json')),visibleResources(reg,state));});
test('generator: "*" state block is the fallback for states without their own entry and is not main-state content',()=>{const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'star',title:'S',description:'D {{state-block:d}}',stateNote:true,stateBlocks:{line:{NSW:'NSW-only line.','*':'Generic line for {{state}}.'},d:{'*':'generic'}},body:'Intro.\n\n{{state-block:line}}\n\n<div className="quick-grid">\n<a href="/x"><strong>X ↗</strong><span>{{state-block:line}}</span></a>\n</div>'}]);const nsw=generate({root:dir,state:'NSW',outDir:tmpDir()}).get('docs/star.mdx'),qld=generate({root:dir,state:'QLD',outDir:tmpDir()}).get('docs/star.mdx');assert.ok(nsw.includes('Intro.\n\nNSW-only line.'));assert.ok(!nsw.includes('Generic line'));assert.ok(!nsw.includes('specific services are listed'));assert.ok(nsw.includes('description: "D generic"'));assert.ok(qld.includes('Intro.\n\nGeneric line for QLD.'));assert.ok(qld.includes('<span>Generic line for QLD.</span>'));assert.ok(qld.includes('- [X](/x): Generic line for QLD.'));assert.ok(!qld.includes('NSW-only line.'));assert.ok(qld.includes('No QLD-specific services are listed on this page.'));});
test('generator: an empty own state block suppresses the "*" fallback',()=>{const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'empty',title:'E',description:'E',stateBlocks:{card:{NSW:'','*':'{{resources:role:ses}}'}},body:'Intro.\n\n{{state-block:card}}\n\nEnd.'}]);const nsw=generate({root:dir,state:'NSW',outDir:tmpDir()}).get('docs/empty.mdx'),qld=generate({root:dir,state:'QLD',outDir:tmpDir()}).get('docs/empty.mdx');assert.ok(nsw.includes('Intro.\n\nEnd.'));assert.ok(!nsw.includes('resource-'));assert.ok(qld.includes('id="resource-qld-ses"'));});

const addSecondSes=dir=>editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,resources:[...s.resources,{id:'qld-ses-2',category:'Urgent',name:'Queensland SES app',url:'https://example.qld.gov.au/ses-app',summary:'Second Queensland SES record in the mini fixture.',jurisdiction:'QLD',reviewed:'2026-10-17',phone:'1800 000 000',roles:['ses']}]}));
test('generator: every record for a role is listed in the bottom section, each once',()=>{const dir=copyRoot();addSecondSes(dir);const text=generate({root:dir,state:'NSW',outDir:tmpDir()}).get('docs/local.mdx');assert.equal(text.slice(text.indexOf(BOTTOM)),`${HEAD}\n\n- **QLD** — State emergency service: [Queensland SES](https://example.qld.gov.au/ses) — [132 500](tel:132500)\n- **QLD** — State emergency service: [Queensland SES app](https://example.qld.gov.au/ses-app) — [1800 000 000](tel:1800000000)\n`);});
test('generator: role token lists every main-state record for the role; placeholders use the first',()=>{const dir=copyRoot();addSecondSes(dir);editJson(path.join(dir,'data/pages.json'),p=>[...p,{slug:'dup',title:'D',description:'D',body:'{{resources:role:ses,qld-ses,role:warnings}}'}]);const files=generate({root:dir,state:'QLD',outDir:tmpDir()}),local=files.get('docs/local.mdx'),dup=files.get('docs/dup.mdx');for(const id of ['qld-ses','qld-ses-2'])assert.equal(local.split(`id="resource-${id}"`).length,2,id);assert.ok(local.indexOf('id="resource-qld-ses"')<local.indexOf('id="resource-qld-ses-2"'));assert.ok(local.includes('Call Queensland SES on 132 500 (tel:132500).'));assert.equal(dup.split('id="resource-qld-ses"').length,2);assert.equal(dup.split('id="resource-qld-ses-2"').length,2);});

// Whole-site tests: every page template built for every state from the real data.
const realBuilds=new Map();
const real=code=>{if(!realBuilds.has(code))realBuilds.set(code,generate({state:code,outDir:tmpDir()}));return realBuilds.get(code);};
const pageSlugs=JSON.parse(fs.readFileSync('data/pages.json','utf8')).map(p=>p.slug);
const OTHER_SECTION=/^## Other states and territories\n[\s\S]*?(?=^## |(?![\s\S]))/gm;
test('all eight states generate',()=>{for(const code of STATE_CODES){const files=real(code);for(const slug of pageSlugs)assert.ok(files.get(`docs/${slug}.mdx`),`${code}: docs/${slug}.mdx`);assert.ok(files.get('public/resources.json'),code);assert.equal(files.size,pageSlugs.length+1,code);assert.ok(!/\{\{/.test([...files.values()].join('')),`${code}: unresolved placeholder`);}});
// Sources and the register list every state's core set, so NSW's role records legitimately appear there.
// Narrow allow-list of NSW wording that is legitimate outside NSW builds, keyed `STATE:slug`: none today.
const NSW_TRACE_ALLOWED=new Set([]);
test('non-main states leave no trace of NSW-only content',()=>{
  const nswOnly=register.filter(r=>r.jurisdiction==='NSW'&&!(r.roles?.length>0)).map(r=>r.id);
  assert.ok(nswOnly.length>10);
  for(const code of STATE_CODES.filter(c=>c!=='NSW')){
    const files=real(code);
    for(const [name,text] of files){
      if(!name.startsWith('docs/')||name==='docs/sources.mdx')continue;
      const slug=name.slice(5,-4),stripped=text.replace(OTHER_SECTION,'');
      if(NSW_TRACE_ALLOWED.has(`${code}:${slug}`))continue;
      for(const word of ['NSW','New South Wales','Service NSW'])assert.ok(!stripped.includes(word),`${code} ${name} mentions "${word}" outside the other-states section`);
    }
    const sources=files.get('docs/sources.mdx'),published=new Set(JSON.parse(files.get('public/resources.json')).map(r=>r.id));
    for(const id of nswOnly){assert.ok(!sources.includes(`id="resource-${id}"`),`${code}: sources lists NSW-only ${id}`);assert.ok(!published.has(id),`${code}: resources.json lists NSW-only ${id}`);}
    for(const id of ['ses','rfs'])assert.ok(sources.includes(`id="resource-${id}"`),`${code}: sources should list NSW core record ${id}`);
  }
});
test('106 stays plain text in every build',()=>{for(const code of STATE_CODES){const files=real(code);for(const [name,text] of files)assert.ok(!/tel:106(?!\d)/.test(text),`${code} ${name} links 106 as a dial link`);const relay=JSON.parse(files.get('public/resources.json')).find(r=>r.id==='relay');assert.equal(relay.phone,'106',code);assert.ok(files.get('docs/sources.mdx').includes('<strong className="phone-link">'),`${code}: relay card is plain text`);}});
// Known bare headings, keyed `STATE:slug:heading`. Each entry is a template defect to fix in data/pages.json; the test fails when an entry stops being bare, so the list cannot go stale.
const KNOWN_BARE_HEADINGS=new Set([]);
const bareHeadings=(code,slug,text)=>{
  const lines=text.replace(/^---\n[\s\S]*?\n---\n/,'').split('\n'),out=[];let fence=false;
  const isHeading=l=>/^#{1,6}\s/.test(l);
  for(let i=0;i<lines.length;i++){
    if(/^```/.test(lines[i])){fence=!fence;continue;}
    if(fence||!isHeading(lines[i]))continue;
    let j=i+1;const body=[];
    while(j<lines.length&&!isHeading(lines[j]))body.push(lines[j++]);
    const content=body.join('\n').trim();
    if(!content||/^No .+-specific services are listed on this page\.( See \[[^\]]+\]\([^)]*\) for the same kinds of service elsewhere\.)?$/.test(content))out.push(`${code}:${slug}:${lines[i].replace(/^#+\s*/,'')}`);
  }
  return out;
};
test('no page has a bare heading in any state build',()=>{
  const found=[];
  for(const code of STATE_CODES)for(const slug of pageSlugs)found.push(...bareHeadings(code,slug,real(code).get(`docs/${slug}.mdx`)));
  const unexpected=found.filter(k=>!KNOWN_BARE_HEADINGS.has(k)),stale=[...KNOWN_BARE_HEADINGS].filter(k=>!found.includes(k));
  assert.deepEqual(unexpected,[],'bare headings (heading followed by another heading, end of file or only the thin-page note)');
  assert.deepEqual(stale,[],'KNOWN_BARE_HEADINGS entries that are no longer bare; remove them');
});
test('bare-heading detector flags headings followed by headings, end of file or only the thin note',()=>{
  assert.deepEqual(bareHeadings('X','p','---\ntitle: "t"\n---\n\n## A\n\n## B\n\ntext\n\n## C\n'),['X:p:A','X:p:C']);
  assert.deepEqual(bareHeadings('X','p','## A\n\nNo QLD-specific services are listed on this page. See [other](#o) for the same kinds of service elsewhere.\n\n## B\n\ntext\n'),['X:p:A']);
  assert.deepEqual(bareHeadings('X','p','## A\n\ntext\n\n```\n## not a heading\n```\n'),[]);
});

test('real data: second records for a role appear in bottom sections and as main-state cards',()=>{const nsw=real('NSW'),bottom=t=>t.slice(t.indexOf(BOTTOM));const fire=bottom(nsw.get('docs/bushfire.mdx'));for(const url of ['https://www.cfa.vic.gov.au/','https://frv.vic.gov.au/contact-us','https://esa.act.gov.au/fire-rescue','https://esa.act.gov.au/rural-fire-service'])assert.equal(fire.split(`](${url})`).length,2,url);const crisis=bottom(nsw.get('docs/crisis-support.mdx'));for(const id of ['vic-mental-health-services','vic-suicideline']){const r=register.find(x=>x.id===id);assert.ok(crisis.includes(`](${r.url})`),id);}const act=real('ACT').get('docs/bushfire.mdx');for(const id of ['act-fire-rescue','act-rfs'])assert.equal(act.split(`id="resource-${id}"`).length,2,id);});

// Bottom section: phoneLabel is the link text (scope words travel with the number), with an intro paragraph and accurate role labels.
test('generator: bottom section uses phoneLabel as link text and falls back to the number',()=>{const dir=copyRoot();editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,resources:s.resources.map(r=>r.id==='qld-ses'?{...r,phoneLabel:'132 500 — Queensland SES (flood and storm only)'}:r)}));const text=generate({root:dir,state:'NSW',outDir:tmpDir()}).get('docs/local.mdx');assert.ok(text.includes('- **QLD** — State emergency service: [Queensland SES](https://example.qld.gov.au/ses) — [132 500 — Queensland SES (flood and storm only)](tel:132500)\n'));const qld=build('QLD').get('docs/local.mdx');assert.ok(qld.includes('[NSW SES](https://example.nsw.gov.au/ses) — [132 500](tel:132500)\n'),'no label: number is the link text');});
test('generator: bottom section intro paragraph appears exactly once per section, before the list',()=>{for(const state of ['NSW','QLD'])for(const [name,text] of build(state)){if(!text.includes(BOTTOM))continue;assert.equal(text.split(INTRO).length,2,`${state} ${name}`);assert.ok(text.includes(`${HEAD}\n\n- **`),`${state} ${name}`);}for(const code of STATE_CODES)for(const [name,text] of real(code)){const n=text.split(BOTTOM).length-1;assert.equal(text.split(INTRO).length-1,n,`${code} ${name}`);if(n)assert.ok(text.includes(`${HEAD}\n\n- **`),`${code} ${name}`);}});
test('role label for mentalHealth does not claim every record is a crisis line',()=>{assert.equal(ROLE_LABELS.mentalHealth,'Mental-health line or services');});
test('real data: NSW bushfire bottom lines carry the phoneLabel scope, not a bare number',()=>{const fire=real('NSW').get('docs/bushfire.mdx');const bottom=fire.slice(fire.indexOf(BOTTOM));for(const [code,scope] of [['TAS',/Information Line/],['NT',/non-emergency/],['WA',/information line/],['SA',/Information Hotline/]]){const line=bottom.split('\n').find(l=>l.startsWith(`- **${code}** — Fire and rescue:`)&&l.includes('tel:'));assert.ok(line,`${code} fire line with a phone`);const text=line.match(/\[([^\]]+)\]\(tel:/)[1];assert.match(text,scope,`${code}: ${text}`);assert.ok(!/^[\d ]+$/.test(text),`${code}: bare number`);}});
test('every role record with a phone has a phoneLabel (the bottom section shows it)',()=>{for(const r of register)if(r.roles?.length&&r.phone)assert.ok(nonEmpty(r.phoneLabel),r.id);});
test('state fixtures pin missingRoles, and each missing role has a manual-verification entry',()=>{const checks=JSON.parse(fs.readFileSync('research/manual-verification.json','utf8')).checks;for(const code of STATE_CODES){const f=fixture(code);assert.ok(Array.isArray(f.missingRoles),`${code} fixture needs missingRoles`);assert.deepEqual(states[code].missingRoles??[],f.missingRoles,code);for(const role of f.missingRoles)assert.ok(checks.some(c=>c.state===code&&c.role===role),`${code}: no manual-verification check for missing role ${role}`);}});

// Sources page: the register is grouped by jurisdiction (national first, then the main state, then the rest) with jump links at the top.
const slugOf=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const groupNames=(info,main,codes)=>['National services',info[main].longName,...codes.filter(c=>c!==main&&info[c]).map(c=>info[c].longName)];
const sectionOf=(text,heading)=>{const start=text.indexOf(`\n## ${heading}\n`);assert.ok(start>=0,`missing "## ${heading}"`);const rest=text.slice(start+1),end=rest.slice(3).search(/\n## /);return end<0?rest:rest.slice(0,end+3);};
test('sources page groups the register by state, main state first, with jump links',()=>{
  for(const code of STATE_CODES){
    const text=real(code).get('docs/sources.mdx'),expected=groupNames(states,code,STATE_CODES);
    assert.deepEqual([...text.matchAll(/^## (.+)$/gm)].map(m=>m[1]).filter(h=>expected.includes(h)),expected,`${code}: group order`);
    const nav=text.match(/^Jump to: (.+)$/m);assert.ok(nav,`${code}: jump links`);
    const links=[...nav[1].matchAll(/\[([^\]]+)\]\(#([^)]+)\)/g)];
    assert.deepEqual(links.map(l=>l[1]),expected,`${code}: link text`);assert.deepEqual(links.map(l=>l[2]),expected.map(slugOf),`${code}: link targets`);
    assert.ok(text.indexOf('Jump to:')<text.indexOf('## National services'),`${code}: links come before the groups`);
    const visible=visibleResources(register,code);
    for(const [i,name] of expected.entries()){
      const want=visible.filter(r=>i===0?r.jurisdiction==='Australia':r.jurisdiction===[code,...STATE_CODES.filter(c=>c!==code)][i-1]).map(r=>r.id).sort();
      const got=[...sectionOf(text,name).matchAll(/id="resource-([^"]+)"/g)].map(m=>m[1]).sort();
      assert.deepEqual(got,want,`${code}: records under "${name}"`);
    }
    for(const r of visible)assert.equal(text.split(`id="resource-${r.id}"`).length-1,1,`${code}: ${r.id} appears once`);
  }
});
test('register grouping: a state with no visible records gets no heading or link',()=>{
  const dir=copyRoot();editJson(path.join(dir,'data/pages.json'),ps=>[...ps,{slug:'register',title:'Register',description:'All records',body:'{{register-nav}}\n\n## All\n\n{{all-resources}}'}]);
  editJson(path.join(dir,'data/states/QLD.json'),s=>({...s,resources:[]}));
  const text=build('NSW',dir).get('docs/register.mdx');
  assert.ok(!text.includes('Queensland'),'empty state omitted');assert.match(text,/^Jump to: \[National services\]\(#national-services\) · \[New South Wales\]\(#new-south-wales\)$/m);
  assert.ok(text.indexOf('## National services')<text.indexOf('## New South Wales'));
});
