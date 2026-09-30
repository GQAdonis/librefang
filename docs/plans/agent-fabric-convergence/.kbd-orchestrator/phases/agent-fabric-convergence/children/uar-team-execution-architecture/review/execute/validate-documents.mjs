import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const Ajv2020=require('/Users/gqadonis/node_modules/ajv/dist/2020.js');
const Ajv=require('/Users/gqadonis/node_modules/ajv');
const addFormats=require('/Users/gqadonis/node_modules/ajv-formats');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'review/execute');
const mini="/Users/gqadonis/Projects/prometheus/prometheus-skills-mini";
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const checks=[];
const prior=process.argv.includes('--failed-only')?JSON.parse(fs.readFileSync(path.join(out,'document-checks.json'),'utf8')):null;
const wanted=name=>!prior||prior.checks.some(c=>c.name===name&&!c.ok);
const record=(name,ok,details)=>{if(wanted(name))checks.push({name,ok,details});};
const schema=read(path.join(root,'examples/execution-profile.schema.json'));
const ajv=new Ajv2020({strict:false,allErrors:true});addFormats(ajv);
const validate=ajv.compile(schema);
for(const file of fs.readdirSync(path.join(root,'examples')).filter(f=>f.endsWith('.json')&&!f.endsWith('.schema.json'))){
 if(!wanted('example:'+file))continue;
 const data=read(path.join(root,'examples',file));const ok=validate(data);
 record('example:'+file,ok,ok?{kind:data.kind,runtimeConformance:data.runtimeConformance}:validate.errors);
}
for(const s of read(path.join(root,'source-hashes.json')).files){
 if(!wanted('source-preserved:'+s.path))continue;
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(s.repository,s.path))).digest('hex');
 record('source-preserved:'+s.path,actual===s.sha256,{expected:s.sha256,actual});
}
const docs=['execution-profile-contract.md','legacy-migration.md','parent-repair-handoff.md'];
for(const doc of docs){
 if(!wanted('links:'+doc))continue;
 const body=fs.readFileSync(path.join(root,doc),'utf8');
 const missing=[];
 for(const m of body.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].split('#')[0].replace(/:\d+$/,'');if(!target||/^https?:|^mailto:/.test(target))continue;
  if(!fs.existsSync(path.resolve(root,decodeURIComponent(target))))missing.push(target);
 }
 record('links:'+doc,missing.length===0,{missing});
}
const older=new Ajv({strict:false,allErrors:true});addFormats(older);
for(const [name,ref] of [['artifact_manifest.json','artifact-manifest.schema.json'],['constraints.json','constraints.schema.json']]){
 if(!wanted('schema:'+name))continue;
 const v=older.compile(read(path.join(mini,'references/schemas',ref)));const ok=v(read(path.join(out,name)));
 record('schema:'+name,ok,ok?'valid':v.errors);
}
for(const variant of read(path.join(out,'artifact_manifest.json')).variants){
 for(const file of variant.files??[variant.file]){
  if(!wanted('manifest-file:'+file))continue;
  const p=path.join(out,'dist',file);record('manifest-file:'+file,fs.existsSync(p)&&fs.statSync(p).size>0,'nonempty document payload');
 }
}
const before=read(path.join(root,'examples/provider-settings-before.json')).data;
const after=read(path.join(root,'examples/provider-settings-after.json')).data;
record('provider-roundtrip-pricing',Boolean(before.pricingIdentity)&&JSON.stringify(before.pricingIdentity)===JSON.stringify(after.pricingIdentity),{note:'Example equality only; independent reviewer checks named fields and semantics.'});
const receipt={schemaVersion:1,recordedAt:new Date().toISOString(),scope:'completed documentation only',runtimeConformance:false,checks,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length};
fs.writeFileSync(path.join(out,prior?'document-checks-failed-only.json':'document-checks.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({passed:receipt.passed,failed:checks.filter(c=>!c.ok)},null,2));process.exitCode=receipt.failed?1:0;
