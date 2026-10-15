// Appends security headers to Blume's generated dist/_headers (Cloudflare Pages and Workers static assets read it).
// A custom public/_headers would replace Blume's file, so this merges instead. The CSP script hashes are computed
// from the built HTML, so a Blume update that changes an inline script is picked up rather than silently blocked.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dist = 'dist', file = path.join(dist, '_headers');
const BEGIN = '# BEGIN security headers', END = '# END security headers';
const html = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const p = path.join(dir, e.name); return e.isDirectory() ? html(p) : p.endsWith('.html') ? [p] : []; });
// Every external link gets rel="noopener noreferrer" (added to, or merged with, any existing rel). Links open in the same tab, so this
// is belt and braces next to the Referrer-Policy header, but it also covers hosts that ignore _headers.
export function addExternalRel() {
  let changed = 0;
  for (const f of html(dist)) {
    const before = fs.readFileSync(f, 'utf8');
    const after = before.replace(/<a\b[^>]*>/g, tag => {
      if (!/\bhref="https?:\/\//.test(tag)) return tag;
      const m = tag.match(/\brel="([^"]*)"/);
      if (!m) return tag.replace(/^<a\b/, '<a rel="noopener noreferrer"');
      const tokens = new Set(m[1].split(/\s+/).filter(Boolean)); tokens.add('noopener'); tokens.add('noreferrer');
      return tag.replace(m[0], `rel="${[...tokens].join(' ')}"`);
    });
    if (after !== before) { fs.writeFileSync(f, after); changed++; }
  }
  return changed;
}
export function inlineScriptHashes() {
  const hashes = new Set();
  for (const f of html(dist)) for (const [, attrs, body] of fs.readFileSync(f, 'utf8').matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\btype="(application\/(ld\+)?json|importmap|speculationrules)"/.test(attrs)) continue; // data blocks, not executed
    hashes.add(`'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`);
  }
  return [...hashes].sort();
}
export function securityBlock() {
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes().join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'", // pages use inline style attributes
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  return [BEGIN, '/*',
    `  Content-Security-Policy: ${csp}`,
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Strict-Transport-Security: max-age=31536000',
    END].join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (!fs.existsSync(file)) throw new Error(`${file} not found; run the Blume build first.`);
  console.log(`rel="noopener noreferrer" ensured on external links in ${addExternalRel()} HTML file(s).`);
  const base = fs.readFileSync(file, 'utf8').replace(new RegExp(`\\n*${BEGIN}[\\s\\S]*?${END}\\n*`), '\n').trimEnd();
  fs.writeFileSync(file, `${base}\n\n${securityBlock()}\n`);
  console.log(`Security headers appended to ${file} (${inlineScriptHashes().length} inline script hash(es)).`);
}
