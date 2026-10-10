import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UarDelegatedRunProjection, WorkflowRunDetail } from "../api";
import { useUarDelegation } from "../lib/queries/uarDelegations";
import { useWorkflowRunDetail } from "../lib/queries/workflows";
import { useApproveUarDelegation, useCancelUarDelegation } from "../lib/mutations/uarDelegations";
import { Button } from "./ui/Button";

function UarWorkflowDelegation({ initial, stepName, workflowRunId }: {
  initial: UarDelegatedRunProjection; stepName: string; workflowRunId: string;
}) {
  const { t } = useTranslation();
  const query = useUarDelegation(initial.bossTaskId);
  const approve = useApproveUarDelegation();
  const cancel = useCancelUarDelegation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const data = query.data ?? initial;
  // Event history never grants decision authority. Only the current owning projection does.
  const pending = query.data?.executionState === "input_required" ? query.data.pendingApproval : undefined;
  const approvalId = pending?.type === "agui.tool_call.approval_required" && typeof pending.data.approval_id === "string"
    ? pending.data.approval_id : undefined;
  const busy = approve.isPending || cancel.isPending || query.isFetching;
  const terminal = ["completed", "failed", "cancelled"].includes(data.executionState);
  const error = approve.error ?? cancel.error ?? query.error;
  const identities = [
    ["boss_task", data.bossTaskId], ["delegation", data.delegationId],
    ["workflow_run", workflowRunId], ["instance", data.selectedInstanceId],
    ["binding", data.targetBindingId], ["workspace", data.workspaceId],
    ["definition_id", data.definition.id], ["definition_version", data.definition.version],
    ["definition_digest", data.definition.digest], ["uar_task", data.uarTaskId],
    ["uar_thread", data.uarThreadId], ["uar_root_run", data.uarRootRunId], ["uar_run", data.uarRunId],
  ];
  const states = [
    ["admission", data.admissionState], ["execution", data.executionState],
    ["effects", data.effectState], ["recovery", data.recoveryState],
    ["cancellation", data.cancellationState], ["projection_retention", data.bossProjectionRetention],
  ];
  return (
    <section className="min-w-0 rounded-xl border border-brand/30 bg-brand/5 p-3 space-y-4"
      data-ui="uar-workflow-delegation" data-boss-task-id={data.bossTaskId}
      data-delegation-id={data.delegationId} data-uar-task-id={data.uarTaskId}
      data-uar-run-id={data.uarRunId} data-workflow-run-id={workflowRunId} data-step-name={stepName}
      data-execution-state={data.executionState} data-cancellation-state={data.cancellationState}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h4 className="text-sm font-semibold break-words">{t("uar_workflow.step", { name: stepName })}</h4>
        <Button variant="secondary" size="sm" disabled={busy} data-ui="uar-workflow-refresh"
          onClick={() => { approve.reset(); cancel.reset(); void query.refetch(); }}>{t("uar_workflow.refresh")}</Button>
      </div>
      <p className="text-xs text-text-dim leading-relaxed">{t("uar_workflow.owner_hint")}</p>
      {query.isLoading && <p role="status" className="text-xs">{t("common.loading")}</p>}
      {error && <div role="alert" data-ui="uar-workflow-error" className="rounded-lg border border-error/30 bg-error/5 p-2 space-y-1">
        <p className="text-xs text-error break-words">{error.message}</p>
        <p className="text-xs text-text-dim">{t("uar_workflow.recovery_hint")}</p>
      </div>}
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {states.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-text-dim">{t(`uar_workflow.${label}`)}</dt><dd className="break-all font-mono">{value}</dd></div>)}
      </dl>
      <div className="space-y-1">
        <h5 className="text-xs font-semibold">{t("uar_workflow.output")}</h5>
        <pre data-ui="uar-workflow-output" className="max-h-64 overflow-auto rounded-lg bg-main p-3 text-xs whitespace-pre-wrap break-words">{data.output || t("uar_workflow.no_output")}</pre>
      </div>
      {approvalId && pending && <section data-ui="uar-workflow-approval" data-approval-id={approvalId}
        className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-3">
        <h5 className="text-sm font-semibold">{t("uar_workflow.approval_required")}</h5>
        <p className="text-xs font-mono break-all">{approvalId}</p>
        {typeof pending.data.name === "string" && <p className="text-xs break-words">{pending.data.name}</p>}
        {typeof pending.data.risk_reason === "string" && <p className="text-xs break-words">{pending.data.risk_reason}</p>}
        {typeof pending.data.arguments_json === "string" && <details>
          <summary className="text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-brand">{t("uar_workflow.arguments")}</summary>
          <pre className="mt-2 max-h-48 overflow-auto text-xs whitespace-pre-wrap break-words">{pending.data.arguments_json}</pre>
        </details>}
        <div className="flex gap-2 flex-wrap">
          {[true, false].map(approved => <Button key={String(approved)} variant="secondary"
            className={approved ? "border-brand/50 text-brand" : ""} disabled={busy || query.isError}
            data-ui="uar-workflow-approval-decision" data-approved={approved}
            onClick={() => approve.mutate({ bossTaskId: data.bossTaskId, approvalId, approved })}>
            {t(approved ? "uar_workflow.approve" : "uar_workflow.deny")}
          </Button>)}
        </div>
      </section>}
      <div className="space-y-2">
        <p className="text-xs text-text-dim">{t("uar_workflow.cancel_settlement", {
          requested: t(data.cancellation.requested ? "uar_workflow.yes" : "uar_workflow.no"),
          acknowledged: t(data.cancellation.acknowledged ? "uar_workflow.yes" : "uar_workflow.no"),
          terminal: t(data.cancellation.terminal ? "uar_workflow.yes" : "uar_workflow.no"),
        })}</p>
        {data.cancellation.cleanupUncertain && <p role="status" className="text-xs text-warning">{t("uar_workflow.cleanup_uncertain")}</p>}
        {!terminal && (confirmCancel ? <div className="space-y-2">
          <p className="text-xs">{t("uar_workflow.cancel_hint")}</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="danger" disabled={busy || query.isError || !query.data} data-ui="uar-workflow-cancel-confirm"
              onClick={() => cancel.mutate(data.bossTaskId, { onSuccess: () => setConfirmCancel(false) })}>{t("uar_workflow.confirm_cancel")}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmCancel(false)}>{t("common.back")}</Button>
          </div>
        </div> : <Button variant="secondary" disabled={busy || query.isError || !query.data || data.cancellation.requested}
          data-ui="uar-workflow-cancel" onClick={() => setConfirmCancel(true)}>{t("uar_workflow.cancel_run")}</Button>)}
      </div>
      <details className="space-y-2">
        <summary className="text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-brand">{t("uar_workflow.correlation")}</summary>
        <dl className="grid grid-cols-1 gap-2 text-xs">
          {identities.map(([label, value]) => <div key={label}><dt className="text-text-dim">{t(`uar_workflow.${label}`)}</dt><dd className="font-mono break-all">{value || t("uar_workflow.unknown")}</dd></div>)}
          <div><dt className="text-text-dim">{t("uar_workflow.progress")}</dt><dd>{data.revision} / {data.cursor}</dd></div>
          {data.runtimeEpoch && <div><dt>{t("uar_workflow.epoch")}</dt><dd className="font-mono break-all">{data.runtimeEpoch}</dd></div>}
        </dl>
        <p className="text-xs text-text-dim">{t("uar_workflow.retention_hint", { mode: data.retention.mode, seconds: data.retention.terminalTtlSeconds, cap: data.retention.terminalRecordCap })}</p>
        {data.expiresAt && <p className="text-xs break-words">{t("uar_workflow.expires", { at: data.expiresAt })}</p>}
        {data.definitionDiagnostics?.map((diagnostic, index) => <p key={index} className="text-xs break-words">{diagnostic.code}: {diagnostic.message}</p>)}
        {!!data.unsupportedSemantics?.length && <p className="text-xs break-words">{t("uar_workflow.unsupported", { values: data.unsupportedSemantics.join(", ") })}</p>}
      </details>
    </section>
  );
}

export function UarWorkflowDelegations({ run }: { run: WorkflowRunDetail }) {
  return <div className="space-y-3">{run.uar_delegations?.map(({ step_name, delegation }) => (
    <UarWorkflowDelegation key={delegation.bossTaskId} initial={delegation} stepName={step_name} workflowRunId={run.id} />
  ))}</div>;
}

/** Canvas keeps its existing run result panel, observing the same ordinary run record. */
export function UarWorkflowRunStatus({ runId }: { runId: string }) {
  const { t } = useTranslation();
  const query = useWorkflowRunDetail(runId, {
    // A queued bound step must remain inspectable before the ordinary run finishes.
    refetchInterval: current => ["completed", "failed", "cancelled"].includes(current.state.data?.state ?? "") ? false : 3000,
  });
  return <div className="p-3 space-y-2">
    {query.error && <p role="alert" className="text-xs text-error">{query.error.message}</p>}
    {query.error && <Button variant="secondary" onClick={() => void query.refetch()}>{t("uar_workflow.refresh")}</Button>}
    {query.data && <UarWorkflowDelegations run={query.data} />}
  </div>;
}
