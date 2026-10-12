import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resumeUarChat, approveUarDelegation, cancelUarDelegation, saveUarChatTarget } from "../http/client";
import { agentKeys, uarChatKeys } from "../queries/keys";

export function useSaveUarChatTarget() {
  const cache = useQueryClient();
  return useMutation({ mutationFn: saveUarChatTarget, onSuccess: (_, input) => {
    cache.invalidateQueries({ queryKey: uarChatKeys.target(input.agentId) });
    cache.invalidateQueries({ queryKey: agentKeys.detail(input.agentId) });
    cache.invalidateQueries({ queryKey: agentKeys.manifest(input.agentId) });
    cache.invalidateQueries({ queryKey: agentKeys.lists() });
  } });
}
export function useUarChatDecision(agentId: string, sessionId?: string | null) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: approveUarDelegation, onSuccess: () => {
    cache.invalidateQueries({ queryKey: uarChatKeys.turns(agentId, sessionId) });
  } });
}
export function useCancelUarChat(agentId: string, sessionId?: string | null) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: cancelUarDelegation, onSuccess: () => {
    cache.invalidateQueries({ queryKey: uarChatKeys.turns(agentId, sessionId) });
  } });
}

export function useResumeUarChat(agentId: string, sessionId?: string | null) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: () => resumeUarChat({ agentId, sessionId }), onSuccess: () => {
    cache.invalidateQueries({ queryKey: uarChatKeys.turns(agentId, sessionId) });
  } });
}
