import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveUarDelegation, cancelUarDelegation } from "../http/client";
import type { UarDelegatedRunProjection } from "../../api";
import { uarKeys, workflowKeys } from "../queries/keys";

function updateProjection(qc: ReturnType<typeof useQueryClient>, data: UarDelegatedRunProjection) {
  qc.setQueryData(uarKeys.delegation(data.bossTaskId), data);
  const updates = [qc.invalidateQueries({ queryKey: uarKeys.delegation(data.bossTaskId) })];
  if (data.workflow) {
    updates.push(qc.invalidateQueries({ queryKey: workflowKeys.runDetail(data.workflow.workflowRunId) }));
    updates.push(qc.invalidateQueries({ queryKey: workflowKeys.runs(data.workflow.workflowId) }));
  }
  return Promise.all(updates);
}

export function useApproveUarDelegation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: approveUarDelegation, onSuccess: data => updateProjection(qc, data) });
}

export function useCancelUarDelegation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cancelUarDelegation, onSuccess: data => updateProjection(qc, data) });
}
