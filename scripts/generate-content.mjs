import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function generate() {
  const resources = JSON.parse(fs.readFileSync(path.join(root,'data/resources.json'),'utf8'));
  const pages = JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'));
  const find = id => { const r=resources.find(r=>r.id===id); if(!r) throw new Error(`Unknown resource: ${id}`); return r; };
  const card = r => `<section className="resource-card" id="resource-${r.id}">\n<div className="resource-meta"><span>${r.jurisdiction}</span><span>Reviewed ${new Date(r.reviewed + "T00:00:00Z").toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</span></div>\n\n### ${r.name}\n\n${r.phone ? (r.id === "relay" ? `<strong className="phone-link">${r.phoneLabel}</strong>\n\n` : `<a className="phone-link" href="tel:${r.phone.replace(/\D/g,'')}">${r.phoneLabel || r.phone}</a>\n\n`) : ''}${r.summary}\n\n${r.hours ? `**Hours:** ${r.hours}\n\n` : ''}${r.caution ? `<div className="resource-caution">\n\n**Important:** ${r.caution}\n\n</div>\n\n` : ''}${r.language ? r.language+'\n\n' : ''}<a className="source-link" href="${r.url}">Open official resource — ${r.name} ↗</a>\n\n</section>`;
  const output = new Map();
  for (const page of pages) {
    const body = page.body.replace(/\{\{resources:([^}]+)\}\}/g,(_,ids)=>'<div className="resource-list">\n\n'+ids.split(',').map(id=>card(find(id))).join('\n\n')+'\n\n</div>').replace('{{all-resources}}','<div className="resource-list">\n\n'+resources.map(card).join('\n\n')+'\n\n</div>');
    output.set(`docs/${page.slug}.mdx`, `---\ntitle: ${JSON.stringify(page.title)}\ndescription: ${JSON.stringify(page.description)}\n---\n\n${body}\n`);
  }
  output.set('public/resources.json',JSON.stringify(resources,null,2)+'\n');
  if(process.argv.includes('--check')) {
    for(const [name,text] of output) if(!fs.existsSync(path.join(root,name)) || fs.readFileSync(path.join(root,name),'utf8')!==text) throw new Error(`Generated file drift: ${name}`);
  } else for(const [name,text] of output) fs.writeFileSync(path.join(root,name),text);
  console.log(`${output.size} generated files ${process.argv.includes('--check')?'verified':'written'} from ${resources.length} resources and ${pages.length} page templates.`);
  return output;
}
generate();
