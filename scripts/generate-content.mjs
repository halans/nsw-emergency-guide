import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_CODES, ROLE_LABELS, loadSite, assertState, loadStates, loadRegister, visibleResources, roleRecord } from './lib/register.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const date = r => new Date(r.reviewed + "T00:00:00Z").toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const digits = phone => phone.replace(/\D/g,'');
const card = r => `<section className="resource-card" id="resource-${r.id}">\n<div className="resource-meta"><span>${r.jurisdiction}</span><span>Reviewed ${date(r)}</span></div>\n\n### ${r.name}\n\n${r.phone ? (r.id === "relay" ? `<strong className="phone-link">${r.phoneLabel}</strong>\n\n` : `<a className="phone-link" href="tel:${digits(r.phone)}">${r.phoneLabel || r.phone}</a>\n\n`) : ''}${r.summary}\n\n${r.hours ? `**Hours:** ${r.hours}\n\n` : ''}${r.caution ? `<div className="resource-caution">\n\n**Important:** ${r.caution}\n\n</div>\n\n` : ''}${r.language ? r.language+'\n\n' : ''}<a className="source-link" href="${r.url}">Open official resource — ${r.name} ↗</a>\n\n</section>`;
// Blume only converts its own components to Markdown for llms-full.txt and the .md mirrors, so raw JSX/HTML is wrapped for the web and given a plain-Markdown twin for agents.
const mdCard = r => `**${r.name}**\n\n${r.jurisdiction} · Reviewed ${date(r)}\n\n${r.phone ? (r.id === "relay" ? `**${r.phoneLabel}**\n\n` : `Phone: [${r.phoneLabel || r.phone}](tel:${digits(r.phone)})\n\n`) : ''}${r.summary}\n\n${r.hours ? `**Hours:** ${r.hours}\n\n` : ''}${r.caution ? `**Important:** ${r.caution}\n\n` : ''}${r.language ? r.language+'\n\n' : ''}[Open official resource — ${r.name}](${r.url})`;
const both = (web, agents) => `<Visibility for="web">\n\n${web}\n\n</Visibility>\n\n<Visibility for="agents">\n\n${agents}\n\n</Visibility>`;
const quote = t => t.trim().split('\n').map(l => l ? '> ' + l : '>').join('\n');
const wrapBlocks = body => body
  .replace(/<div className="(scope-note|urgent-box)">\n\n([\s\S]*?)\n\n<\/div>/g, (m, cls, inner) => both(m, quote(inner)))
  .replace(/<div className="quick-grid">\n([\s\S]*?)\n<\/div>/g, (m, inner) => both(m, [...inner.matchAll(/<a href="([^"]+)"><strong>(.*?)<\/strong><span>(.*?)<\/span><\/a>/g)].map(([, href, title, desc]) => `- [${title.replace(/\s*↗$/, '')}](${href}): ${desc.replace(/&amp;/g, '&')}`).join('\n')));
const list = rs => both('<div className="resource-list">\n\n' + rs.map(card).join('\n\n') + '\n\n</div>', rs.map(mdCard).join('\n\n'));

// Per-build context: the main state, its data file, the full register and what is visible in this build.
function buildContext(root, state) {
  assertState(state);
  const states = loadStates(root);
  if (!states[state]) throw new Error(`No data file for state ${state}: data/states/${state}.json`);
  const register = loadRegister(root);
  return { state, states, info: states[state], register, visible: visibleResources(register, state) };
}

// {{state-block:key}}: the page's block for the main state, else its "*" fallback (generic wording, not main-state content), else nothing (with its leading blank lines).
function expandStateBlocks(text, page, ctx, seen) {
  return text.replace(/(\n*)\{\{state-block:([^}]+)\}\}/g, (_, lead, key) => {
    const own = page.stateBlocks?.[key]?.[ctx.state], block = own ?? page.stateBlocks?.[key]?.['*'] ?? '';
    if (!block.trim()) return '';
    if (own !== undefined) seen.mainContent = true;
    return lead + block;
  });
}

// {{state}}, {{state-long}}, {{term:role}}, {{phone:role}}, {{tel:role}}. A missing value always fails the build.
function expandPlaceholders(text, page, ctx) {
  return text.replace(/\{\{(state|state-long)\}\}|\{\{(term|phone|tel):([^}]+)\}\}/g, (token, bare, prefixed, role) => {
    const kind = bare ?? prefixed;
    const fail = () => { throw new Error(`Page "${page.slug}": ${token} has no value for ${ctx.state}`); };
    if (kind === 'state') return ctx.info.name ?? fail();
    if (kind === 'state-long') return ctx.info.longName ?? fail();
    if (kind === 'term') return ctx.info.terms?.[role] ?? fail();
    const phone = roleRecord(ctx.register, ctx.state, role)?.phone ?? fail();
    return kind === 'phone' ? phone : digits(phone);
  });
}

// One id of a {{resources:...}} token: a register id or role:<role>. Returns null when the record is skipped in this build.
function resolveId(id, token, page, ctx) {
  if (id.startsWith('role:')) {
    const role = id.slice(5), r = roleRecord(ctx.register, ctx.state, role);
    if (r) return r;
    if ((ctx.info.missingRoles ?? []).includes(role)) return null;
    throw new Error(`Page "${page.slug}": ${id} in ${token} has no record for ${ctx.state}`);
  }
  const r = ctx.register.find(r => r.id === id);
  if (!r) throw new Error(`Unknown resource: ${id}`);
  // Lists show national and main-state records only; other states' core records belong in the bottom section.
  return r.jurisdiction === 'Australia' || r.jurisdiction === ctx.state ? r : null;
}

function renderList(rs, ctx, seen) {
  if (rs.some(r => r.jurisdiction === ctx.state)) seen.mainContent = true;
  return rs.length ? list(rs) : '';
}

function expandResources(text, page, ctx, seen) {
  return text
    .replace(/\{\{resources:([^}]+)\}\}/g, (token, ids) => renderList(ids.split(',').map(id => resolveId(id, token, page, ctx)).filter(Boolean), ctx, seen))
    .replace('{{all-resources}}', () => renderList(ctx.visible, ctx, seen));
}

// The link is added only when the page's bottom section exists, so it never points at a missing anchor.
const thinNote = (ctx, linked) => `No ${ctx.info.name}-specific services are listed on this page.${linked ? ' See [other states and territories](#other-states-and-territories) for the same kinds of service elsewhere.' : ''}`;

// Plain Markdown, valid for both web and agents: one line per other state's record for the page's roles.
function otherStatesSection(page, ctx) {
  const lines = [];
  for (const code of STATE_CODES) {
    if (code === ctx.state || !ctx.states[code]) continue;
    const listed = new Set();
    for (const role of page.roles ?? []) {
      const r = roleRecord(ctx.register, code, role);
      if (!r || listed.has(r.id)) continue;
      listed.add(r.id);
      const phone = !r.phone ? '' : r.id === 'relay' ? ` — ${r.phone}` : ` — [${r.phone}](tel:${digits(r.phone)})`;
      lines.push(`- **${code}** — ${ROLE_LABELS[role]}: [${r.name}](${r.url})${phone}`);
    }
  }
  return lines.length ? `## Other states and territories\n\n${lines.join('\n')}` : '';
}

function assertResolved(text, page) {
  const left = text.match(/\{\{[^}]*\}\}/);
  if (left) throw new Error(`Page "${page.slug}": unknown placeholder ${left[0]}`);
}

function renderPage(page, ctx) {
  const seen = { mainContent: false };
  const fill = text => expandPlaceholders(expandStateBlocks(text, page, ctx, seen), page, ctx);
  const title = fill(page.title), description = fill(page.description);
  let body = expandResources(wrapBlocks(fill(page.body)), page, ctx, seen);
  const section = otherStatesSection(page, ctx);
  if (page.stateNote && !seen.mainContent) body += `\n\n${thinNote(ctx, !!section)}`;
  if (section) body += `\n\n${section}`;
  for (const text of [title, description, body]) assertResolved(text, page);
  return `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${body}\n`;
}

export function generate({ root = repo, state, outDir = root, check = false } = {}) {
  const ctx = buildContext(root, state ?? loadSite(root).mainState);
  const pages = JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'));
  const output = new Map();
  for (const page of pages) output.set(`docs/${page.slug}.mdx`, renderPage(page, ctx));
  output.set('public/resources.json',JSON.stringify(ctx.visible,null,2)+'\n');
  if(check) {
    for(const [name,text] of output) if(!fs.existsSync(path.join(outDir,name)) || fs.readFileSync(path.join(outDir,name),'utf8')!==text) throw new Error(`Generated file drift: ${name}`);
  } else for(const [name,text] of output) { fs.mkdirSync(path.dirname(path.join(outDir,name)),{recursive:true}); fs.writeFileSync(path.join(outDir,name),text); }
  return output;
}

const isEntryPoint = () => { try { return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isEntryPoint()) {
  const args = process.argv.slice(2);
  const flag = name => {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
    return value;
  };
  const check = args.includes('--check'), out = flag('--out');
  const output = generate({ state: flag('--state'), outDir: out ? path.resolve(out) : undefined, check });
  const pages = [...output.keys()].filter(name => name.startsWith('docs/')).length;
  const resources = JSON.parse(output.get('public/resources.json')).length;
  console.log(`${output.size} generated files ${check?'verified':'written'} from ${resources} resources and ${pages} page templates.`);
}
