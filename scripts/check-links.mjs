import fs from 'node:fs';
const resources=JSON.parse(fs.readFileSync('data/resources.json','utf8'));
const urls=[...new Set(resources.flatMap(r=>[r.url,r.resolvedUrl,r.corroboratingSource].filter(Boolean)))];
const results=[];let next=0;
async function worker(){ while(next<urls.length){const url=urls[next++];try{const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'EmergencyReady-LinkCheck/1.0'}}); await response.body?.cancel();results.push({url,status:response.status,resolved:response.url,result:response.ok?'reachable':response.status===404||response.status===410?'broken':'needs-review'});}catch(e){results.push({url,result:'needs-review',error:e.message});}} }
await Promise.all(Array.from({length:5},worker));results.sort((a,b)=>a.url.localeCompare(b.url));
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/external-links.json',JSON.stringify({checkedAt:new Date().toISOString(),note:'HTTP reachability is not content verification. Timeouts, blocks and challenges need manual review; do not remove a service on this result alone.',results},null,2)+'\n');
for(const r of results)console.log(`${r.result.padEnd(12)} ${r.status||'ERR'} ${r.url}`);
if(results.some(r=>r.result==='broken'))process.exitCode=1;
