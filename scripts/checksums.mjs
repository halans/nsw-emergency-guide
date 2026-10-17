import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const exclude=new Set(['node_modules','.blume','.wrangler','.git','test-results','playwright-report','.superpowers']);
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function walk(dir='.') { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const f=path.join(dir,e.name);if(exclude.has(e.name)||e.name==='SHA256SUMS.json')return [];return e.isDirectory()?walk(f):[f.replaceAll('\\','/')];}).sort(); }
if(process.argv.includes('--verify')) { const expected=JSON.parse(fs.readFileSync('SHA256SUMS.json','utf8'));let count=0;for(const [file,hash] of Object.entries(expected)){if(!fs.existsSync(file)||digest(file)!==hash)throw new Error(`Checksum mismatch: ${file}`);count++;}console.log(`Verified ${count} packaged files.`); }
else { const out=Object.fromEntries(walk().map(f=>[f,digest(f)]));fs.writeFileSync('SHA256SUMS.json',JSON.stringify(out,null,2)+'\n');console.log(`Checksums written for ${Object.keys(out).length} files.`); }
