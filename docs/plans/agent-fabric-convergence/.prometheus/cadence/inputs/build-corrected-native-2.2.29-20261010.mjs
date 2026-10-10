import fs from 'node:fs'
import path from 'node:path'
import {spawn,execFileSync} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import os from 'node:os'
const repository='/Users/gqadonis/Projects/prometheus/worktrees/afc-c16-team-guidance/build/integration-source/uar'
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim()
if(source!=='308aea46ff26e7f61340281bb51f67ebe5351569')throw Error('Native source differs from frozen corrective source')
const directory=path.join(process.cwd(),'.prometheus/cadence/artifacts','customer-native-2.2.29-'+randomUUID())
fs.mkdirSync(directory,{recursive:true,mode:0o700})
const logPath=path.join(directory,'build.log'),receiptPath=path.join(directory,'build.json')
const output=fs.openSync(logPath,'wx',0o600)
const disk=fs.statfsSync(repository)
const receipt={schemaVersion:1,kind:'actual-production-native-payload-build',source,version:'2.2.29',platform:'darwin-arm64',startedAt:new Date().toISOString(),status:'running',steps:[],logPath,newCadenceDelivery:false,testing:'none',capacity:{diskFreeBytes:disk.bavail*disk.bsize,freeMemoryBytes:os.freemem(),jobs:1},reason:'Complete observed standalone decision-owner and exact read-target repairs; build native executable for corrected customer candidate'}
const env={...process.env,CARGO_BUILD_JOBS:'1',CARGO_INCREMENTAL:'0',RUSTC_WRAPPER:'/opt/homebrew/bin/sccache',UAR_SIDECAR_FEATURES:'server-full',PATH:'/Users/gqadonis/.local/share/fnm/node-versions/v24.21.0/installation/bin:/Users/gqadonis/.cargo/bin:/opt/homebrew/bin:'+process.env.PATH}
async function run(command,args){const step={command,args,startedAt:new Date().toISOString()};receipt.steps.push(step);const child=spawn(command,args,{cwd:repository,env,shell:false,stdio:['ignore',output,output]});receipt.pid=child.pid;fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});step.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});step.finishedAt=new Date().toISOString();return step.exitCode===0}
try{const built=await run('/Users/gqadonis/.cargo/bin/cargo',['+1.97.1','build','--locked','--no-default-features','--features','server-full','--target','aarch64-apple-darwin','--bin','uar-sidecar','--release','--jobs','1']);const packaged=built&&await run(process.execPath,['scripts/package-boss-sidecar.mjs','darwin-arm64','aarch64-apple-darwin']);receipt.status=packaged?'passed':'failed';if(packaged)receipt.payload=JSON.parse(fs.readFileSync(path.join(repository,'dist/boss-sidecar/uar-sidecar-darwin-arm64.json'),'utf8'))}catch(error){receipt.status='failed';receipt.failureCode=error.code??'NATIVE_BUILD_PROCESS_FAILED'}finally{receipt.finishedAt=new Date().toISOString();receipt.elapsedMs=Date.parse(receipt.finishedAt)-Date.parse(receipt.startedAt);receipt.sourceAfter=execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim();if(receipt.sourceAfter!==source)receipt.status='failed';fs.closeSync(output);fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({status:receipt.status,source,receiptPath,finishedAt:receipt.finishedAt}));process.exitCode=receipt.status==='passed'?0:1}
