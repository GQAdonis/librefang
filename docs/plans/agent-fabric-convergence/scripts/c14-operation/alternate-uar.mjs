// Opt-in real external UAR fixture; execution belongs to the completed packaged operation.
import { spawn } from 'node:child_process'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename, dirname, isAbsolute, resolve } from 'node:path'
import { createServer } from 'node:net'
import { ipc } from './setup.mjs'

const SOURCE = '5a8fd22e1543ddbd7a182b2557fe94f631117c13'
const fail = code => { throw new Error(code) }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
function jwt(secret, principal) {
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
  const payload = Buffer.from(JSON.stringify({sub:principal,name:null,roles:['user'],exp:Math.floor(Date.now()/1000)+7200})).toString('base64url')
  const signed = header+'.'+payload
  return signed+'.'+createHmac('sha256',secret).update(signed).digest('base64url')
}
async function port() {
  const listener = createServer()
  await new Promise((resolve,reject) => {listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve)})
  const selected = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  return selected
}

async function packagedPolicies(policiesDirectory) {
  if(typeof policiesDirectory!=='string'||!isAbsolute(policiesDirectory))fail('ALTERNATE_UAR_PACKAGED_POLICIES_REQUIRED')
  const directory=resolve(policiesDirectory)
  const manifest=JSON.parse(await readFile(join(dirname(directory),'payload-manifest.json'),'utf8'))
  if(manifest.schema!==1||manifest.name!=='uar-sidecar'||manifest.source!==SOURCE||!Array.isArray(manifest.files))
    fail('ALTERNATE_UAR_PACKAGED_POLICY_SOURCE_MISMATCH')
  const policies=[]
  for(const name of ['default.cedar','skill-mutation.cedar','tool-approval.cedar']) {
    const entry=manifest.files.find(file=>file.path==='policies/'+name)
    if(!entry||!Number.isInteger(entry.size)||entry.size<=0||!/^([a-f0-9]{64})$/.test(entry.sha256??''))
      fail('ALTERNATE_UAR_PACKAGED_POLICY_MANIFEST_INCOMPLETE')
    const bytes=await readFile(join(directory,name))
    if(bytes.length!==entry.size||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)
      fail('ALTERNATE_UAR_PACKAGED_POLICY_DIGEST_MISMATCH')
    policies.push({name,bytes})
  }
  return policies
}

/** Call only from the approved packaged operation composition, with its same evaluate context.
 * No API call selects Work's global instance, changes installed definitions, or starts inference.
 * Regular JWT server is required: uar-sidecar launch-token transport cannot be relabelled external JWT.
 */
async function prepare({evaluate, signal, binary, binarySha256, sourceCommit, modelsDirectory, policiesDirectory, startupTimeoutMs=120000}) {
  const active=()=>{if(signal?.aborted)fail('ALTERNATE_UAR_FIXTURE_CANCELLED')}
  active()
  if(sourceCommit!==SOURCE)fail('ALTERNATE_UAR_EXACT_SOURCE_REQUIRED')
  if(basename(binary).startsWith('uar-sidecar'))fail('ALTERNATE_UAR_REGULAR_JWT_SERVER_BINARY_REQUIRED')
  if(!/^[a-f0-9]{64}$/.test(binarySha256??''))fail('ALTERNATE_UAR_BUILD_CHECKSUM_REQUIRED')
  if(createHash('sha256').update(await readFile(binary)).digest('hex')!==binarySha256)fail('ALTERNATE_UAR_BUILD_CHECKSUM_MISMATCH')
  const verifiedPolicies=await packagedPolicies(policiesDirectory)
  const gatewayCredential=process.env.LITER_LLM_MASTER_KEY
  if(!gatewayCredential?.trim())fail('ALTERNATE_UAR_DECLARED_GATEWAY_CREDENTIAL_UNAVAILABLE')
  const initial=await ipc(evaluate,'prometheus.uar.instances.read',{})
  const root=await mkdtemp(join(tmpdir(),'bossfang-alternate-uar-'))
  await mkdir(join(root,'home'));await mkdir(join(root,'data'));await mkdir(join(root,'empty-skills'))
  // Native5a loads cwd/policies; copy only the verified packaged bytes, keeping governance enabled.
  await mkdir(join(root,'policies'))
  for(const policy of verifiedPolicies)await writeFile(join(root,'policies',policy.name),policy.bytes,{mode:0o600,flag:'wx'})
  const id='bossfang-alternate-'+randomUUID()
  const selectedPort=await port();const endpoint='http://127.0.0.1:'+selectedPort
  const jwtSecret=randomBytes(32).toString('hex'), admin=randomBytes(32).toString('hex')
  const principal='fixture.'+randomUUID();let bearer=jwt(jwtSecret,principal)
  const configFile=join(root,'config.yaml')
  // JSON is valid YAML; this file contains no credential values.
  await writeFile(configFile,JSON.stringify({server:{host:'127.0.0.1',port:selectedPort},security:{jwt_required:true,settings_mutation_auth_required:true},service_instance:{instance_id:id,ownership:'external',workspace_location:'local',runtime_endpoint:endpoint,administration_endpoint:endpoint,models_endpoint:endpoint},a2a:{instance_id:id},persistence:{provider:'surreal',database_url:'surrealkv://'+join(root,'data','runtime.db')},memory:{enabled:false},skill_evolution:{enabled:false}}))
  const env={PATH:process.env.PATH,HOME:join(root,'home'),TMPDIR:root,RUST_LOG:'warn',UAR_SERVER__LOG_FORMAT:'json',UAR_SECURITY__JWT_REQUIRED:'true',UAR_SECURITY__JWT_SECRET:jwtSecret,UAR_SECURITY__SETTINGS_ADMIN_KEY:admin,CREDENTIAL_ENCRYPTION_KEY:randomBytes(32).toString('hex'),UAR_BUILTIN_SKILLS_DIR:join(root,'empty-skills'),UAR_NATIVE_TOOLS__FILE_TOOLS_ENABLED:'false',UAR_NATIVE_TOOLS__WEB_FETCH_ENABLED:'false',UAR_NATIVE_TOOLS__TERMINAL_EXEC_ENABLED:'false',...(modelsDirectory?{UAR_MODELS_DIR:modelsDirectory}:{})}
  const child=spawn(binary,['--config',configFile,'--port',String(selectedPort)],{cwd:root,env,stdio:['ignore','ignore','ignore']})
  let spawnFailed=false,exited=false,registered=false
  child.on('error',()=>{spawnFailed=true});child.on('exit',()=>{exited=true})
  const onAbort=()=>{if(!exited)child.kill('SIGTERM')}
  signal?.addEventListener('abort',onAbort,{once:true})
  if(signal?.aborted)onAbort()
  let stopping
  function stop() {
    return stopping??=(async()=>{
      try {
        if(registered){const inventory=await ipc(evaluate,'prometheus.uar.instances.read',{});if(inventory.selectedInstanceId===id)fail('ALTERNATE_UAR_FIXTURE_UNEXPECTEDLY_SELECTED');await ipc(evaluate,'prometheus.uar.instances.delete',{expectedRevision:inventory.revision,instanceId:id});registered=false}
      } finally {
        signal?.removeEventListener('abort',onAbort)
        bearer=''
        if(!exited){child.kill('SIGTERM');for(let n=0;n<100&&!exited;n++)await sleep(100);if(!exited){child.kill('SIGKILL');for(let n=0;n<50&&!exited;n++)await sleep(100)}}
        if(!exited&&!spawnFailed)fail('ALTERNATE_UAR_OWNED_PROCESS_EXIT_UNCONFIRMED')
        await rm(root,{recursive:true,force:true})
      }
    })().catch(()=>fail('ALTERNATE_UAR_FIXTURE_CLEANUP_FAILED'))
  }
  const request=async(path,body) => {
    active()
    const response=await fetch(endpoint+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+bearer,'x-uar-admin-key':admin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)})
    if(!response.ok)fail('ALTERNATE_UAR_HTTP_'+response.status)
    return response.json()
  }
  try {
    const deadline=Date.now()+startupTimeoutMs;let capabilities
    while(Date.now()<deadline){active();if(spawnFailed||exited)fail('ALTERNATE_UAR_NATIVE_STARTUP_FAILED');try{capabilities=await request('/api/uar/capabilities');break}catch{}await sleep(250)}
    if(!capabilities)fail('ALTERNATE_UAR_NATIVE_READINESS_UNCONFIRMED')
    if(capabilities.instance?.id!==id||capabilities.ownership!=='external'||capabilities.authentication?.principalMode!=='token-subject')fail('ALTERNATE_UAR_REAL_IDENTITY_AUTH_MISMATCH')
    const providerId='bossfang-fixture-gateway'
    await request('/api/uar/providers',{id:providerId,display_name:'C14 real configured gateway',base_url:'http://localhost:4000/v1',protocol:'chat',default_model:'gpt-6.1-sol',models:[{id:'gpt-6.1-sol',enabled:true,execution_profile:{profile:{id:'uar.openai-compatible-chat.settings-v1',revision:1},settingsRevision:1,reasoning:{mode:'off'}},pricing_identity:{provider_id:'openai',model_id:'gpt-6.1-sol'}}],enabled:true,api_key:gatewayCredential})
    active()
    const current=await ipc(evaluate,'prometheus.uar.instances.read',{})
    if(current.selectedInstanceId!==initial.selectedInstanceId)fail('ALTERNATE_UAR_WORK_SELECTION_CHANGED_EXTERNALLY')
    const saved=await ipc(evaluate,'prometheus.uar.instances.save',{expectedRevision:current.revision,instance:{id,name:'C14 real external UAR fixture',enabled:true,ownership:'external',expectedRuntimeId:id,profile:capabilities.instance.profile,minimumVersion:'',workspaceLocation:'local',workspaceRoots:[],requiredCapabilities:['full_harness_delegation_v1'],endpoints:capabilities.endpoints,runtimeCredentialRef:'uar-instance://'+id,adminCredentialRef:'uar-instance://'+id+'/admin'},runtimeCredential:{operation:'set',value:bearer},adminCredential:{operation:'set',value:admin}})
    registered=true
    if(saved.selectedInstanceId!==initial.selectedInstanceId)fail('ALTERNATE_UAR_WORK_SELECTION_MUTATED')
    const tested=await ipc(evaluate,'prometheus.uar.instances.test',{instanceId:id})
    const row=tested.instances.find(item=>item.id===id)
    if(row?.compatibility!=='operational'||!row.checks.authenticated||row.observed?.id!==id)fail('ALTERNATE_UAR_REAL_INVENTORY_ADMISSION_FAILED')
    return {configuration:{alternateInstanceId:id,alternateModelId:providerId+'/gpt-6.1-sol'},publicFixture:{sourceCommit,instanceId:id,endpoint,credentialEnv:'LITER_LLM_MASTER_KEY',expiresInSeconds:7200,selectedInstanceId:initial.selectedInstanceId},stop}
  } catch (error) {await stop();throw error}
}

/** Never return native/provider/IPC response bodies or secret-bearing failure arguments. */
export async function prepareAlternateUar(input) {
  try{return await prepare(input)}catch(error){
    const message=error instanceof Error?error.message:''
    fail(/^ALTERNATE_UAR_[A-Z0-9_]+$/.test(message)?message:'ALTERNATE_UAR_FIXTURE_SETUP_FAILED')
  }
}

