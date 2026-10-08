import type { UarDelegatedHostContext, UarWorkflowTarget } from "../api";

export const emptyUarWorkflowTarget = (): UarWorkflowTarget => ({
  targetBindingId: "", workspaceId: "", definition: { id: "", version: "", digest: "" }, run: {},
});

/** Canvas JSON is an actual import boundary; accept only the authored target DTO. */
export function isUarWorkflowTarget(value: unknown): value is UarWorkflowTarget {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const target = value as Record<string, unknown>;
  if (typeof target.targetBindingId !== "string" || typeof target.workspaceId !== "string") return false;
  if (target.delegatedHostContextId !== undefined &&
    (typeof target.delegatedHostContextId !== "string" || !target.delegatedHostContextId.trim())) return false;
  if (!target.definition || typeof target.definition !== "object" || Array.isArray(target.definition)) return false;
  const definition = target.definition as Record<string, unknown>;
  return [definition.id, definition.version, definition.digest].every(field => typeof field === "string")
    && !!target.run && typeof target.run === "object" && !Array.isArray(target.run);
}

/** Host metadata is a selection aid; UAR revalidates the original grant and lease. */
export function matchesUarHostContext(target: UarWorkflowTarget, context: UarDelegatedHostContext): boolean {
  return context.workspaceId === target.workspaceId && context.binding.id === target.targetBindingId
    && context.definition.id === target.definition.id && context.definition.version === target.definition.version
    && context.definition.digest === target.definition.digest && Date.parse(context.expiresAt) > Date.now();
}

export function isUarWorkflowTargetBound(value: unknown): value is UarWorkflowTarget {
  return isUarWorkflowTarget(value) && [value.targetBindingId, value.workspaceId, value.definition.id,
    value.definition.version, value.definition.digest].every(field => field.trim() !== "");
}
