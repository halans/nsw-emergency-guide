import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function generate() {
  const resources = JSON.parse(fs.readFileSync(path.join(root,'data/resources.json'),'utf8'));
  const pages = JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'));
  const find = id => { const r=resources.find(r=>r.id===id); if(!r) throw new Error(`Unknown resource: ${id}`); return r; };
  const card = r => `<section className="resource-card" id="resource-${r.id}">\n<div className="resource-meta"><span>${r.jurisdiction}</span><span>Reviewed ${new Date(r.reviewed + "T00:00:00Z").toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</span></div>\n\n### ${r.name}\n\n${r.phone ? (r.id === "relay" ? `<strong className="phone-link">${r.phoneLabel}</strong>\n\n` : `<a className="phone-link" href="tel:${r.phone.replace(/\D/g,'')}">${r.phoneLabel || r.phone}</a>\n\n`) : ''}${r.summary}\n\n${r.hours ? `**Hours:** ${r.hours}\n\n` : ''}${r.caution ? `<div className="resource-caution">\n\n**Important:** ${r.caution}\n\n</div>\n\n` : ''}${r.language ? r.language+'\n\n' : ''}<a className="source-link" href="${r.url}">Open official resource — ${r.name} ↗</a>\n\n</section>`;
  // Blume only converts its own components to Markdown for llms-full.txt and the .md mirrors, so raw JSX/HTML is wrapped for the web and given a plain-Markdown twin for agents.
  const date = r => new Date(r.reviewed + "T00:00:00Z").toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  const mdCard = r => `**${r.name}**\n\n${r.jurisdiction} · Reviewed ${date(r)}\n\n${r.phone ? (r.id === "relay" ? `**${r.phoneLabel}**\n\n` : `Phone: [${r.phoneLabel || r.phone}](tel:${r.phone.replace(/\D/g,'')})\n\n`) : ''}${r.summary}\n\n${r.hours ? `**Hours:** ${r.hours}\n\n` : ''}${r.caution ? `**Important:** ${r.caution}\n\n` : ''}${r.language ? r.language+'\n\n' : ''}[Open official resource — ${r.name}](${r.url})`;
  const both = (web, agents) => `<Visibility for="web">\n\n${web}\n\n</Visibility>\n\n<Visibility for="agents">\n\n${agents}\n\n</Visibility>`;
  const quote = t => t.trim().split('\n').map(l => l ? '> ' + l : '>').join('\n');
  const wrapBlocks = body => body
    .replace(/<div className="(scope-note|urgent-box)">\n\n([\s\S]*?)\n\n<\/div>/g, (m, cls, inner) => both(m, quote(inner)))
    .replace(/<div className="quick-grid">\n([\s\S]*?)\n<\/div>/g, (m, inner) => both(m, [...inner.matchAll(/<a href="([^"]+)"><strong>(.*?)<\/strong><span>(.*?)<\/span><\/a>/g)].map(([, href, title, desc]) => `- [${title.replace(/\s*↗$/, '')}](${href}): ${desc.replace(/&amp;/g, '&')}`).join('\n')));
  const list = rs => both('<div className="resource-list">\n\n' + rs.map(card).join('\n\n') + '\n\n</div>', rs.map(mdCard).join('\n\n'));
  const output = new Map();
  for (const page of pages) {
    const body = wrapBlocks(page.body).replace(/\{\{resources:([^}]+)\}\}/g,(_,ids)=>list(ids.split(',').map(find))).replace('{{all-resources}}',()=>list(resources));
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
