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
  return operation(context, {...configuration,bossfang:fixture}, actual)
}
