// Appends security headers to Blume's generated dist/_headers (Cloudflare Pages and Workers static assets read it).
// A custom public/_headers would replace Blume's file, so this merges instead. The CSP script hashes are computed
// from the built HTML, so a Blume update that changes an inline script is picked up rather than silently blocked.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dist = 'dist', file = path.join(dist, '_headers');
const BEGIN = '# BEGIN security headers', END = '# END security headers';
const html = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const p = path.join(dir, e.name); return e.isDirectory() ? html(p) : p.endsWith('.html') ? [p] : []; });
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
  const base = fs.readFileSync(file, 'utf8').replace(new RegExp(`\\n*${BEGIN}[\\s\\S]*?${END}\\n*`), '\n').trimEnd();
  fs.writeFileSync(file, `${base}\n\n${securityBlock()}\n`);
  console.log(`Security headers appended to ${file} (${inlineScriptHashes().length} inline script hash(es)).`);
}
