import { queryOptions, useQuery } from "@tanstack/react-query";
import { getUarDelegation } from "../http/client";
import type { UarDelegatedRunProjection } from "../../api";
import { uarKeys } from "./keys";
import { withOverrides, type QueryOverrides } from "./options";

export const uarDelegationQueryOptions = (bossTaskId: string) => queryOptions({
  queryKey: uarKeys.delegation(bossTaskId),
  queryFn: () => getUarDelegation(bossTaskId),
  enabled: !!bossTaskId,
  staleTime: 0,
  // Keep the owning projection current while approvals or cancellation are unsettled.
  refetchInterval: (query) => {
    const data = query.state.data;
    return data && ["completed", "failed", "cancelled"].includes(data.executionState)
      && (!data.cancellation.requested || data.cancellation.terminal) ? false : 3000;
  },
  refetchIntervalInBackground: false,
});

export function useUarDelegation(bossTaskId: string, options: QueryOverrides<UarDelegatedRunProjection> = {}) {
  return useQuery(withOverrides(uarDelegationQueryOptions(bossTaskId), options));
}
