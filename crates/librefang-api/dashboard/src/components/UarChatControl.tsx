import { useTranslation } from "react-i18next";
import { useUarChatTarget, useUarChatTurns } from "../lib/queries/uarChat";
import { useCancelUarChat, useResumeUarChat, useUarChatDecision } from "../lib/mutations/uarChat";
import { UarTargetSettings } from "./UarTargetSettings";
import { Button } from "./ui/Button";

export function UarChatControl({ agentId, sessionId }: { agentId: string; sessionId?: string | null }) {
  const { t } = useTranslation();
  const target = useUarChatTarget(agentId);
  const query = useUarChatTurns(agentId, sessionId, !!target.data?.target);
  const cancel = useCancelUarChat(agentId, sessionId);
  const resume = useResumeUarChat(agentId, sessionId);
  const decide = useUarChatDecision(agentId, sessionId);
  const turns = query.data?.turns ?? [];
  const active = turns.find((turn) => !["completed", "failed", "cancelled"].includes(turn.executionState));
  const latest = active ?? turns[turns.length - 1];
  const pending = active?.executionState === "input_required" ? active.pendingApproval : undefined;
  const approvalId = pending?.type === "agui.tool_call.approval_required" && typeof pending.data.approval_id === "string"
    ? pending.data.approval_id : undefined;
  const error = query.error ?? cancel.error ?? resume.error ?? decide.error;
  return <div className="border-b border-border-subtle p-3 space-y-2">
    <details open={!target.data?.target}>
      <summary className="text-sm text-brand cursor-pointer py-1">{t("uar_chat.target")}{target.data?.target ? ` · ${target.data.target.targetId}` : ""}</summary>
      <div className="mt-2"><UarTargetSettings agentId={agentId} /></div>
    </details>
    {latest && <div className="text-xs space-y-2" data-uar-run-id={latest.uarRunId}>
      {latest.effectiveTarget && <p>{t("uar_chat.agent")}: {latest.effectiveTarget.agent_id} · {t("uar_chat.model")}: {latest.effectiveTarget.provider_id}/{latest.effectiveTarget.model_id}</p>}
      <p role="status">{t("uar_workflow.execution")}: {latest.executionState} · {t("uar_workflow.recovery")}: {latest.recoveryState}</p>
      {active && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={resume.isPending} onClick={() => resume.mutate()}>{t("uar_chat.resume")}</Button>
        <Button size="sm" variant="secondary" disabled={cancel.isPending || active.cancellation.requested} onClick={() => cancel.mutate(active.bossTaskId)}>{t("uar_workflow.cancel_run")}</Button>
      </div>}
      {approvalId && active && pending && <section className="rounded-lg border border-warning/40 p-3 space-y-2">
        <p>{t("uar_workflow.approval_required")}</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{typeof pending.data.arguments_json === "string" ? pending.data.arguments_json : JSON.stringify(pending.data, null, 2)}</pre>
        <div className="flex gap-2">{[true, false].map((approved) => <Button size="sm" variant="secondary" key={String(approved)} disabled={decide.isPending || query.isError} onClick={() => decide.mutate({ bossTaskId: active.bossTaskId, approvalId, expectedRevision: active.revision, approved })}>{t(approved ? "uar_workflow.approve" : "uar_workflow.deny")}</Button>)}</div>
      </section>}
      <details><summary className="cursor-pointer">{t("uar_workflow.correlation")}</summary>
        <dl className="break-all space-y-1 py-2"><dt>{t("uar_workflow.uar_run")}</dt><dd>{latest.uarRunId ?? "—"}</dd><dt>{t("uar_workflow.workspace")}</dt><dd>{latest.workspaceId}</dd></dl>
        {turns.map((turn) => <div key={turn.bossTaskId} className="border-t border-border-subtle py-2 space-y-1"><p>{turn.chat.input}</p><p className="text-text-dim">{turn.executionState}</p><pre className="whitespace-pre-wrap break-words max-h-48 overflow-auto">{turn.output}</pre></div>)}
      </details>
    </div>}
    {error && <p role="alert" className="text-xs text-error break-words">{error.message}</p>}
  </div>;
}
