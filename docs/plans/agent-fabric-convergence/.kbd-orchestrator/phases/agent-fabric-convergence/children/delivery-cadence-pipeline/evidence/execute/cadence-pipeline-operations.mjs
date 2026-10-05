import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
export const root=(await fs.readFile('/tmp/cadence-pipeline-boundary-location.txt','utf8')).trim();
export const full='/Users/gqadonis/Projects/prometheus/worktrees/cadence-pipeline-full/dist/plugins/codex/prometheus-skill-pack/skills/delivery-cadence/scripts/cadence.mjs';
export const mini='/Users/gqadonis/Projects/prometheus/worktrees/cadence-pipeline-mini/dist/plugins/codex/prometheus-skills-mini/skills/delivery-cadence/scripts/cadence.mjs';
export const results=[];
export const assert=(condition,message)=>{if(!condition)throw Error(message);};
export async function write(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof value==='string'?value:JSON.stringify(value,null,2));return file;}
export function run(command,args,cwd){return new Promise(resolve=>{const proc=spawn(command,args,{cwd,shell:false,env:process.env});let stdout='',stderr='';proc.stdout.on('data',c=>stdout+=c);proc.stderr.on('data',c=>stderr+=c);proc.on('error',e=>resolve({code:1,stdout,stderr:stderr+e.message}));proc.on('close',code=>resolve({code,stdout,stderr}));});}
export async function command(cli,state,verb,input={},id=randomUUID(),expect=true){const file=await write(path.join(root,'requests',`${id}.json`),input);const r=await run(process.execPath,[cli,...verb.split(' '),'--root',state,'--input',file,'--command-id',id],root);if(expect&&r.code!==0)throw Error(`${verb}: ${r.stderr||r.stdout}`);if(!expect){assert(r.code!==0,`${verb} should refuse this request`);return r;}return JSON.parse(r.stdout);}
export async function fixture(name,{delay=0}={}){
  const repo=path.join(root,name);await fs.mkdir(repo,{recursive:true});
  await write(path.join(repo,'.gitignore'),'dist/\n');
  await write(path.join(repo,'app.mjs'),"import fs from 'node:fs/promises';const v=JSON.parse(await fs.readFile(new URL('../data.json',import.meta.url)));if(process.argv[2]==='operate'){if(v.value<1)throw Error('No usable value');console.log(JSON.stringify({operation:'sum',value:v.value+1}));}else console.log('launch');\n");
  await write(path.join(repo,'data.json'),{value:1});
  await write(path.join(repo,'build.mjs'),`import fs from 'node:fs/promises';await new Promise(r=>setTimeout(r,${delay}));await fs.mkdir('dist',{recursive:true});await fs.copyFile('app.mjs','dist/app.mjs');console.log('built');\n`);
  for(const args of [['init','-q'],['config','user.name','Cadence operation fixture'],['config','user.email','fixture@example.invalid'],['config','commit.gpgsign','false'],['add','.'],['commit','-qm','fixture: standalone delivery operation\n\nAssisted-by: Codex:GPT-6 [Node]']]){const r=await run('git',args,repo);assert(!r.code,r.stderr);}
  const checkpoints=[{id:'build',kind:'build',command:'node',args:['build.mjs'],cwd:repo,outputRoots:[path.join(repo,'dist')]},{id:'launch',kind:'run',purpose:'launch',command:'node',args:['dist/app.mjs'],cwd:repo},{id:'feature',kind:'run',purpose:'feature',command:'node',args:['dist/app.mjs','operate'],cwd:repo}];
  const outcome=`Operate ${name} sum`;
  const scope={tasks:[`${name}:implement`],changes:[name],phases:[],outcomes:[outcome],deliveryClass:'cli-function'};
  const featureOperation={id:`${name}-sum`,outcome,promisedCapability:'Use built sum CLI',procedure:'Launch built program and operate sum',checkpointId:'feature',entrypoint:{command:'node',args:['dist/app.mjs','operate'],cwd:repo,sourcePaths:['app.mjs'],buildProducedPaths:['dist/app.mjs']},target:{kind:'local',description:'Real built Node CLI in disposable checkout'},evidenceLevel:'local',expectedResult:'sum JSON returned',prerequisites:[],isolatedResources:[repo],externalEffects:[],authorityRefs:[],limitations:['Not product inference or remote publication evidence']};
  return {repo,checkpoints,scope,featureOperation,sourceRefs:[{repository:repo}]};
}
export async function init(state,f,extra={},cli=full){return command(cli,state,'init',{profile:{name:'pipeline-boundary',mode:'standalone',iterationMinutes:120,reviewEvery:0,checkpoints:f.checkpoints,publication:{mode:'count',every:2,platforms:['darwin-arm64','win32-x64'],requireMetadata:true,websiteUrl:'https://example.invalid/delivery'},resources:{registryRoot:path.join(root,'resources')},...extra}});}
export async function prepare(state,f,cli=full){await command(cli,state,'start',{scope:f.scope,featureOperation:f.featureOperation,sourceRefs:f.sourceRefs});await write(path.join(f.repo,'data.json'),{value:2});return command(cli,state,'ready',{codeComplete:true});}
export async function complete(state,f,cli=full){await command(cli,state,'checkpoint',{id:'build',artifacts:[{path:path.join(f.repo,'dist/app.mjs')}]});await command(cli,state,'checkpoint',{id:'launch'});await command(cli,state,'checkpoint',{id:'feature'});return command(cli,state,'finish',{completion:{tasks:f.scope.tasks,changes:f.scope.changes,phases:[]}});}
export async function receipt(name,value){results.push({name,...value,observedAt:new Date().toISOString()});await write(path.join(root,'main-results.json'),results);console.log(name+': '+(value.status??'passed'));}
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
export const digest=v=>hash(JSON.stringify(sorted(v)));
