// Real fixed-lifetime grant observation; invoked only by the completed packaged operation.
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname, isAbsolute, resolve } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'

const SOURCE='5a8fd22e1543ddbd7a182b2557fe94f631117c13'
const fail=(code,cause)=>{throw new Error(code,cause?{cause}:undefined)}
const safe=error=>/^C14_GRANT_EXPIRY_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'C14_GRANT_EXPIRY_FIXTURE_FAILED'
const startupCause=error=>error?.cause?.kind==='grant-expiry-startup'?error.cause:undefined

async function packagedPolicies(policiesDirectory) {
  if(typeof policiesDirectory!=='string'||!isAbsolute(policiesDirectory))fail('C14_GRANT_EXPIRY_PACKAGED_POLICIES_REQUIRED')
  const directory=resolve(policiesDirectory)
  const manifest=JSON.parse(await readFile(join(dirname(directory),'payload-manifest.json'),'utf8'))
  if(manifest.schema!==1||manifest.name!=='uar-sidecar'||manifest.source!==SOURCE||!Array.isArray(manifest.files))
    fail('C14_GRANT_EXPIRY_PACKAGED_POLICY_SOURCE_MISMATCH')
  const policies=[]
  for(const name of ['default.cedar','skill-mutation.cedar','tool-approval.cedar']) {
    const entry=manifest.files.find(file=>file.path==='policies/'+name)
    if(!entry||!Number.isInteger(entry.size)||entry.size<=0||!/^([a-f0-9]{64})$/.test(entry.sha256??''))
      fail('C14_GRANT_EXPIRY_PACKAGED_POLICY_MANIFEST_INCOMPLETE')
    const bytes=await readFile(join(directory,name))
    if(bytes.length!==entry.size||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)
      fail('C14_GRANT_EXPIRY_PACKAGED_POLICY_DIGEST_MISMATCH')
    policies.push({name,bytes})
  }
  return policies
}

async function prepare({binary,binarySha256,sourceCommit,modelsDirectory,policiesDirectory,signal}) {
  const active=()=>{if(signal?.aborted)fail('C14_GRANT_EXPIRY_CANCELLED')}
  active()
  if(sourceCommit!==SOURCE)fail('C14_GRANT_EXPIRY_EXACT_SOURCE_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(binarySha256??''))fail('C14_GRANT_EXPIRY_BUILD_CHECKSUM_REQUIRED')
  if(createHash('sha256').update(await readFile(binary)).digest('hex')!==binarySha256)fail('C14_GRANT_EXPIRY_BUILD_CHECKSUM_MISMATCH')
  const verifiedPolicies=await packagedPolicies(policiesDirectory)
  const root=await mkdtemp(join(tmpdir(),'bossfang-grant-expiry-'))
  const instanceId='grant-expiry-'+randomUUID(),workspaceId=randomUUID(),principal='fixture.'+randomUUID()
  let launchToken=randomBytes(32).toString('hex'),grantToken='',child,exited=false,spawnFailed=false,endpoint,stopping
  const startup={kind:'grant-expiry-startup',exitCode:null,exitSignal:null,spawnCode:null,stdinCode:null,stdoutTail:'',stderrTail:''}
  const abort=()=>{if(child&&!exited)child.kill('SIGTERM')}
  function stop(){
    return stopping??=(async()=>{
      signal?.removeEventListener('abort',abort)
      launchToken='';grantToken=''
      if(child&&!exited){child.stdin.end();for(let n=0;n<100&&!exited;n++)await pause(100);if(!exited){child.kill('SIGTERM');for(let n=0;n<50&&!exited;n++)await pause(100)}if(!exited){child.kill('SIGKILL');for(let n=0;n<50&&!exited;n++)await pause(100)}}
      if(child&&!exited&&!spawnFailed)fail('C14_GRANT_EXPIRY_OWNED_EXIT_UNCONFIRMED')
      await rm(root,{recursive:true,force:true})
    })().catch(()=>fail('C14_GRANT_EXPIRY_CLEANUP_FAILED'))
  }
  try {
    await mkdir(join(root,'home'));await mkdir(join(root,'data'));await mkdir(join(root,'empty-skills'))
    // Native5a loads cwd/policies; copy only the verified packaged bytes, keeping governance enabled.
    await mkdir(join(root,'policies'))
    for(const policy of verifiedPolicies)await writeFile(join(root,'policies',policy.name),policy.bytes,{mode:0o600,flag:'wx'})
    const configFile=join(root,'config.yaml')
    await writeFile(configFile,JSON.stringify({service_instance:{instance_id:instanceId,ownership:'managed',workspace_location:'local'},a2a:{instance_id:instanceId},persistence:{provider:'surreal',database_url:'surrealkv://'+join(root,'data','runtime.db')},memory:{enabled:false},skill_evolution:{enabled:false}}))
    const env={PATH:process.env.PATH,HOME:join(root,'home'),TMPDIR:root,RUST_LOG:'warn',UAR_SECURITY__SETTINGS_ADMIN_KEY:randomBytes(32).toString('hex'),CREDENTIAL_ENCRYPTION_KEY:randomBytes(32).toString('hex'),UAR_SECURITY__SETTINGS_MUTATION_AUTH_REQUIRED:'true',UAR_BUILTIN_SKILLS_DIR:join(root,'empty-skills'),UAR_NATIVE_TOOLS__FILE_TOOLS_ENABLED:'false',UAR_NATIVE_TOOLS__WEB_FETCH_ENABLED:'false',UAR_NATIVE_TOOLS__TERMINAL_EXEC_ENABLED:'false',...(modelsDirectory?{UAR_MODELS_DIR:modelsDirectory}:{})}
    // Capture only this fixture's bounded startup output, never the app's token or raw environment.
    const privateValues=[launchToken,env.UAR_SECURITY__SETTINGS_ADMIN_KEY,env.CREDENTIAL_ENCRYPTION_KEY]
    const redact=value=>{
      let text=String(value)
      for(const secret of privateValues)text=text.replaceAll(secret,'[redacted]')
      return text.replace(/\bBearer\s+[^\s"']+/gi,'Bearer [redacted]')
        .replace(/\b[a-f0-9]{32,}\b/gi,'[redacted]')
        .replaceAll(root,'[fixture]').replaceAll(binary,'[binary]')
        .replaceAll(modelsDirectory??'\u0000','[models]')
        .replaceAll(policiesDirectory,'[policies]')
    }
    const capture=(field,data)=>{if(!endpoint)startup[field]=redact(startup[field]+data.toString()).slice(-8192)}
    const errorCode=error=>/^[A-Z][A-Z0-9_]+$/.test(error?.code??'')?error.code:'UNKNOWN'
    child=spawn(binary,['--config',configFile,'--port','0'],{cwd:root,env,stdio:['pipe','pipe','pipe']})
    child.on('error',error=>{spawnFailed=true;startup.spawnCode=errorCode(error)})
    child.on('exit',(code,signal)=>{exited=true;startup.exitCode=code;startup.exitSignal=signal})
    child.stdin.on('error',error=>{spawnFailed=true;startup.stdinCode=errorCode(error)})
    child.stderr.on('data',data=>capture('stderrTail',data))
    let lines=''
    child.stdout.on('data',data=>{capture('stdoutTail',data);lines=(lines+data.toString()).slice(-8192);const match=lines.match(/(?:^|\n)READY:(\d+)\r?\n/);if(match)endpoint='http://127.0.0.1:'+match[1]})
    signal?.addEventListener('abort',abort,{once:true})
    if(signal?.aborted)abort()
    child.stdin.write(launchToken+'\n')
    const deadline=Date.now()+120000
    while(!endpoint&&Date.now()<deadline){active();if(spawnFailed||exited)fail('C14_GRANT_EXPIRY_NATIVE_STARTUP_FAILED',{...startup});await pause(250,undefined,{signal})}
    if(!endpoint)fail('C14_GRANT_EXPIRY_NATIVE_READY_UNCONFIRMED',{...startup})
    const request=(path,token,init={})=>{active();return fetch(endpoint+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)})}
    const issuedResponse=await request('/api/uar/delegation-grants',launchToken,{method:'POST',headers:{'x-uar-principal':principal,'Content-Type':'application/json'},body:JSON.stringify({workspace_ids:[workspaceId],operations:['discovery']})})
    if(issuedResponse.status!==201)fail('C14_GRANT_EXPIRY_ISSUANCE_HTTP_'+issuedResponse.status)
    const received=performance.now(),issued=await issuedResponse.json()
    if(issued.expires_in!==900||issued.principal!==principal||issued.instance_id!==instanceId||!issued.runtime_epoch||!Number.isFinite(Date.parse(issued.expires_at))||!/^([a-f0-9]{64})$/.test(issued.token??'')||issued.workspace_ids?.length!==1||issued.workspace_ids[0]!==workspaceId||issued.operations?.length!==1||issued.operations[0]!=='discovery')fail('C14_GRANT_EXPIRY_ISSUED_CONTRACT_MISMATCH')
    grantToken=issued.token;delete issued.token
    const initialResponse=await request('/api/uar/capabilities',grantToken)
    if(initialResponse.status!==200)fail('C14_GRANT_EXPIRY_INITIAL_DISCOVERY_HTTP_'+initialResponse.status)
    const initial=await initialResponse.json()
    if(initial.instance?.id!==instanceId||initial.authentication?.principalMode!=='token-subject')fail('C14_GRANT_EXPIRY_INITIAL_IDENTITY_MISMATCH')
    let observation
    async function expiredGrantRefusal(){
      if(observation)return observation
      // A real monotonic wait, never an accelerated clock or configuration override.
      while(performance.now()-received<901000){active();if(exited)fail('C14_GRANT_EXPIRY_PROCESS_EXITED_BEFORE_OBSERVATION');await pause(Math.min(1000,901000-(performance.now()-received)),undefined,{signal})}
      const host=await request('/api/uar/full-harness/v1/capabilities',launchToken, {headers:{'x-uar-principal':principal}})
      if(host.status!==200)fail('C14_GRANT_EXPIRY_HOST_CONTINUITY_HTTP_'+host.status)
      const runtime=await host.json()
      if(runtime.runtime_epoch!==issued.runtime_epoch)fail('C14_GRANT_EXPIRY_RUNTIME_EPOCH_CHANGED')
      const refused=await request('/api/uar/capabilities',grantToken)
      if(refused.status!==401)fail('C14_GRANT_EXPIRY_EXPECTED_REFUSAL_HTTP_'+refused.status)
      const elapsedMilliseconds=Math.floor(performance.now()-received)
      observation={initialAuthorizedStatus:200,expiredStatus:401,expiresInSeconds:900,expiresAt:issued.expires_at,elapsedMilliseconds,sourceRevision:sourceCommit,binarySha256,instanceId,initialProcessId:child.pid,observedProcessId:child.pid,runtimeEpoch:issued.runtime_epoch,sameRuntimeConfirmed:true,revoked:false,renewed:false,endpoint:'/api/uar/capabilities',observedAt:new Date().toISOString()}
      return observation
    }
    return {expiredGrantRefusal:()=>expiredGrantRefusal().catch(error=>fail(safe(error))),stop}
  } catch(error){await stop();fail(safe(error),startupCause(error))}
}

/** Private host/grant tokens never leave the closure, logs, environment, or receipts. */
export async function prepareGrantExpiryFixture(input){try{return await prepare(input)}catch(error){fail(safe(error),startupCause(error))}}
