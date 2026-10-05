import { prepareGrantExpiryFixture } from './grant-expiry.mjs'
import { prepareExternalBossFang } from './external-bossfang.mjs'
import { prepareAlternateUar } from './alternate-uar.mjs'
import operation from './bossfang-operation.mjs'
import { setup } from './setup.mjs'

/** The coordinator's composition seam; preserves the same packaged app context. */
export async function operateBossFang(context, configuration, selection) {
  let actual = selection
  if (!actual?.workspaceId || !actual?.selectedModel) {
    // Teams may fail before recording its workspace. Ordinary existing setup
    // configures the real gateway/workspace, never a synthetic native outcome.
    try {
      const configured = await setup(context.evaluate, configuration)
      actual = {workspaceId: configured.workspaceId, selectedModel: configured.model}
    } catch {
      // The operation writes its blocked receipt with a stable, secret-free code.
      actual = undefined
    }
  }
  // References configure optional real fixtures; values are never written into wrappers or receipts.
  const env=process.env
  const fixture={...configuration.bossfang,
    ...(env.BOSS_C14_ALTERNATE_UAR_INSTANCE_ID?{alternateInstanceId:env.BOSS_C14_ALTERNATE_UAR_INSTANCE_ID}:{}),
    ...(env.BOSS_C14_ALTERNATE_UAR_MODEL_ID?{alternateModelId:env.BOSS_C14_ALTERNATE_UAR_MODEL_ID}:{}),
    ...(env.BOSS_C14_EXTERNAL_BOSSFANG_ENDPOINT?{external:{endpoint:env.BOSS_C14_EXTERNAL_BOSSFANG_ENDPOINT,
      usernameEnv:env.BOSS_C14_EXTERNAL_BOSSFANG_USERNAME_ENV,passwordEnv:env.BOSS_C14_EXTERNAL_BOSSFANG_PASSWORD_ENV}}:{})}
  const binary=env.BOSS_C14_ALTERNATE_UAR_BINARY
  const fixtureReferences=[binary,env.BOSS_C14_ALTERNATE_UAR_BINARY_SHA256,env.BOSS_C14_ALTERNATE_UAR_SOURCE,env.BOSS_C14_ALTERNATE_UAR_MODELS_DIR]
  if(fixtureReferences.some(Boolean)&&!fixtureReferences.every(Boolean))
    throw new Error('ALTERNATE_UAR_FIXTURE_BUILD_REFERENCES_INCOMPLETE')
  const externalBinary=env.BOSS_C14_EXTERNAL_BOSSFANG_BINARY
  const externalReferences=[externalBinary,env.BOSS_C14_EXTERNAL_BOSSFANG_BINARY_SHA256,env.BOSS_C14_EXTERNAL_BOSSFANG_SOURCE]
  if(externalReferences.some(Boolean)&&!externalReferences.every(Boolean))
    throw new Error('EXTERNAL_BOSSFANG_FIXTURE_BUILD_REFERENCES_INCOMPLETE')
  const grantBinary=env.BOSS_C14_GRANT_EXPIRY_UAR_BINARY
  const grantReferences=[grantBinary,env.BOSS_C14_GRANT_EXPIRY_UAR_BINARY_SHA256,env.BOSS_C14_GRANT_EXPIRY_UAR_SOURCE,env.BOSS_C14_GRANT_EXPIRY_UAR_MODELS_DIR]
  if(grantReferences.some(Boolean)&&!grantReferences.every(Boolean))
    throw new Error('C14_GRANT_EXPIRY_BUILD_REFERENCES_INCOMPLETE')
  let owned,ownedExternal,ownedGrant
  try {
    // Start this independent real grant before the other fixtures to overlap the production renewal wait.
    if(grantBinary){
      ownedGrant=await prepareGrantExpiryFixture({binary:grantBinary,
        binarySha256:env.BOSS_C14_GRANT_EXPIRY_UAR_BINARY_SHA256,
        sourceCommit:env.BOSS_C14_GRANT_EXPIRY_UAR_SOURCE,
        modelsDirectory:env.BOSS_C14_GRANT_EXPIRY_UAR_MODELS_DIR,signal:context.signal})
    }
    if(binary){
      owned=await prepareAlternateUar({evaluate:context.evaluate,signal:context.signal,binary,
        binarySha256:env.BOSS_C14_ALTERNATE_UAR_BINARY_SHA256,sourceCommit:env.BOSS_C14_ALTERNATE_UAR_SOURCE,
        modelsDirectory:env.BOSS_C14_ALTERNATE_UAR_MODELS_DIR})
      Object.assign(fixture,owned.configuration)
    }
    if(externalBinary){
      ownedExternal=await prepareExternalBossFang({binary:externalBinary,
        binarySha256:env.BOSS_C14_EXTERNAL_BOSSFANG_BINARY_SHA256,
        sourceCommit:env.BOSS_C14_EXTERNAL_BOSSFANG_SOURCE,signal:context.signal})
      Object.assign(fixture,ownedExternal.configuration)
    }
    // Credentials stay in a private lexical argument; configuration and receipts receive no secrets.
    // Existing boundary stages own UI switches and restoration before either fixture is stopped.
    return await operation(context, {...configuration,bossfang:fixture}, actual,
      {externalBossFangCredentials:ownedExternal?.credentials,expiredGrantRefusal:ownedGrant?.expiredGrantRefusal})
  } finally {
    try {if(ownedExternal)await ownedExternal.stop()}
    finally {
      try {if(owned)await owned.stop()}
      finally {if(ownedGrant)await ownedGrant.stop()}
    }
  }
}
