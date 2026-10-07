import { useTranslation } from "react-i18next";
import type { UarWorkflowTarget } from "../api";
import { useUarStatus } from "../lib/queries/uar";
import { CANVAS_INPUT_CLASS } from "../lib/canvas";
import { Button } from "./ui/Button";

export function UarWorkflowStepTarget({ value, onChange }: {
  value: UarWorkflowTarget; onChange: (value: UarWorkflowTarget) => void;
}) {
  const { t } = useTranslation();
  const status = useUarStatus();
  const binding = status.data?.effective_binding;
  const fields = [
    ["binding", value.targetBindingId, (text: string) => onChange({ ...value, targetBindingId: text })],
    ["workspace", value.workspaceId, (text: string) => onChange({ ...value, workspaceId: text })],
    ["definition_id", value.definition.id, (text: string) => onChange({ ...value, definition: { ...value.definition, id: text } })],
    ["definition_version", value.definition.version, (text: string) => onChange({ ...value, definition: { ...value.definition, version: text } })],
    ["definition_digest", value.definition.digest, (text: string) => onChange({ ...value, definition: { ...value.definition, digest: text } })],
  ] as const;
  return (
    <section className="mt-3 space-y-3" data-ui="uar-workflow-target-fields">
      <p className="text-xs leading-relaxed text-text-dim">{t("uar_workflow.target_hint")}</p>
      <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 space-y-1" data-ui="uar-workflow-connection" data-instance-id={binding?.instance_id}>
        <p className="text-xs font-semibold">{t("uar_workflow.selected_connection")}</p>
        {status.isLoading ? <p className="text-xs text-text-dim">{t("common.loading")}</p> : binding ? (
          <p className="text-xs break-all">{binding.instance_id} · {binding.profile} · {binding.workspace_locality}</p>
        ) : <p className="text-xs text-warning">{t("uar_workflow.no_connection")}</p>}
        {binding && !binding.capabilities.includes("full_harness_delegation_v1") && <p className="text-xs text-warning">{t("uar_workflow.unsupported_connection")}</p>}
        {status.data?.compatibility && <p className="text-xs break-words">{status.data.compatibility.code}: {status.data.compatibility.message}</p>}
        {status.error && <p role="alert" className="text-xs text-error break-words">{status.error.message}</p>}
        <Button variant="secondary" size="sm" onClick={() => void status.refetch()} disabled={status.isFetching}>{t("uar_workflow.refresh")}</Button>
      </div>
      {fields.map(([key, text, update]) => (
        <label key={key} className="block space-y-1">
          <span className="text-xs font-semibold">{t(`uar_workflow.${key}`)} <span aria-hidden="true">*</span></span>
          <input value={text} onChange={event => update(event.target.value)} required aria-required="true"
            data-ui={`uar-workflow-${key.replaceAll("_", "-")}`} className={CANVAS_INPUT_CLASS} />
        </label>
      ))}
      <p className="text-xs text-text-dim leading-relaxed">{t("uar_workflow.identity_hint")}</p>
    </section>
  );
}
