// Real fixed-lifetime grant observation; invoked only by the completed packaged operation.
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'

const SOURCE='5a8fd22e1543ddbd7a182b2557fe94f631117c13'
const fail=code=>{throw new Error(code)}
const safe=error=>/^C14_GRANT_EXPIRY_[A-Z0-9_]+$/.test(error?.message??'')?error.message:'C14_GRANT_EXPIRY_FIXTURE_FAILED'

async function prepare({binary,binarySha256,sourceCommit,modelsDirectory,signal}) {
  const active=()=>{if(signal?.aborted)fail('C14_GRANT_EXPIRY_CANCELLED')}
  active()
  if(sourceCommit!==SOURCE)fail('C14_GRANT_EXPIRY_EXACT_SOURCE_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(binarySha256??''))fail('C14_GRANT_EXPIRY_BUILD_CHECKSUM_REQUIRED')
  if(createHash('sha256').update(await readFile(binary)).digest('hex')!==binarySha256)fail('C14_GRANT_EXPIRY_BUILD_CHECKSUM_MISMATCH')
  const root=await mkdtemp(join(tmpdir(),'bossfang-grant-expiry-'))
  const instanceId='grant-expiry-'+randomUUID(),workspaceId=randomUUID(),principal='fixture.'+randomUUID()
  let launchToken=randomBytes(32).toString('hex'),grantToken='',child,exited=false,spawnFailed=false,endpoint,stopping
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
    const configFile=join(root,'config.yaml')
    await writeFile(configFile,JSON.stringify({service_instance:{instance_id:instanceId,ownership:'managed',workspace_location:'local'},a2a:{instance_id:instanceId},persistence:{provider:'surreal',database_url:'surrealkv://'+join(root,'data','runtime.db')},memory:{enabled:false},skill_evolution:{enabled:false}}))
    const env={PATH:process.env.PATH,HOME:join(root,'home'),TMPDIR:root,RUST_LOG:'warn',UAR_SECURITY__SETTINGS_ADMIN_KEY:randomBytes(32).toString('hex'),CREDENTIAL_ENCRYPTION_KEY:randomBytes(32).toString('hex'),UAR_SECURITY__SETTINGS_MUTATION_AUTH_REQUIRED:'true',UAR_BUILTIN_SKILLS_DIR:join(root,'empty-skills'),UAR_NATIVE_TOOLS__FILE_TOOLS_ENABLED:'false',UAR_NATIVE_TOOLS__WEB_FETCH_ENABLED:'false',UAR_NATIVE_TOOLS__TERMINAL_EXEC_ENABLED:'false',...(modelsDirectory?{UAR_MODELS_DIR:modelsDirectory}:{})}
    child=spawn(binary,['--config',configFile,'--port','0'],{cwd:root,env,stdio:['pipe','pipe','ignore']})
    child.on('error',()=>{spawnFailed=true});child.on('exit',()=>{exited=true});child.stdin.on('error',()=>{spawnFailed=true})
    let lines=''
    child.stdout.on('data',data=>{lines=(lines+data.toString()).slice(-8192);const match=lines.match(/(?:^|\n)READY:(\d+)\r?\n/);if(match)endpoint='http://127.0.0.1:'+match[1]})
    signal?.addEventListener('abort',abort,{once:true})
    if(signal?.aborted)abort()
    child.stdin.write(launchToken+'\n')
    const deadline=Date.now()+120000
    while(!endpoint&&Date.now()<deadline){active();if(spawnFailed||exited)fail('C14_GRANT_EXPIRY_NATIVE_STARTUP_FAILED');await pause(250,undefined,{signal})}
    if(!endpoint)fail('C14_GRANT_EXPIRY_NATIVE_READY_UNCONFIRMED')
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
  } catch(error){await stop();fail(safe(error))}
}

/** Private host/grant tokens never leave the closure, logs, environment, or receipts. */
export async function prepareGrantExpiryFixture(input){try{return await prepare(input)}catch(error){fail(safe(error))}}
