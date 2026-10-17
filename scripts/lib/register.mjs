import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const readJson=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
export const STATE_CODES=['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];
export const ROLES=['ses','fire','warnings','police','health','mentalHealth','recovery'];
export const ROLE_LABELS={ses:'State emergency service',fire:'Fire and rescue',warnings:'Warnings and incidents',police:'Police assistance (non-emergency)',health:'Health department',mentalHealth:'Mental-health line or services',recovery:'Recovery and disaster assistance'};
export const loadSite=(root=repo)=>readJson(root,'data/site.json');
export const assertState=code=>{if(!STATE_CODES.includes(code))throw new Error(`Unknown main state "${code}" (set mainState in data/site.json, or pass --state). Valid: ${STATE_CODES.join(', ')}`);};
export const loadStates=(root=repo)=>Object.fromEntries(STATE_CODES.filter(c=>fs.existsSync(path.join(root,`data/states/${c}.json`))).map(c=>[c,readJson(root,`data/states/${c}.json`)]));
export const loadRegister=(root=repo)=>{
  const states=loadStates(root),register=[...readJson(root,'data/resources.json')];
  for(const c of STATE_CODES)register.push(...(states[c]?.resources??[]));
  const seen=new Set();
  for(const r of register){if(seen.has(r.id))throw new Error(`Duplicate resource id "${r.id}"`);seen.add(r.id);}
  return register;
};
export const visibleResources=(register,mainState)=>register.filter(r=>r.jurisdiction==='Australia'||r.jurisdiction===mainState||(Array.isArray(r.roles)&&r.roles.length>0));
export const roleRecord=(register,state,role)=>register.find(r=>r.jurisdiction===state&&Array.isArray(r.roles)&&r.roles.includes(role));
