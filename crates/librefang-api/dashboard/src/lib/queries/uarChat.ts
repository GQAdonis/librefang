import { queryOptions, useQuery } from "@tanstack/react-query";
import { getUarChatTarget, getUarChatTurns } from "../http/client";
import { uarChatKeys } from "./keys";

export function useUarChatTarget(agentId: string) {
  return useQuery(queryOptions({
    queryKey: uarChatKeys.target(agentId), queryFn: () => getUarChatTarget(agentId),
    enabled: !!agentId, staleTime: 15_000,
  }));
}
export function useUarChatTurns(agentId: string, sessionId?: string | null, enabled = true) {
  return useQuery(queryOptions({
    queryKey: uarChatKeys.turns(agentId, sessionId), queryFn: () => getUarChatTurns(agentId, sessionId),
    enabled: !!agentId && enabled, staleTime: 1_000,
    // The authoritative durable projection advances while the normal chat streams.
    refetchInterval: 2_000, refetchIntervalInBackground: false,
  }));
}
