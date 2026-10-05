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
  return operation(context, configuration, actual)
}
