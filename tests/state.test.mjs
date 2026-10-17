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
