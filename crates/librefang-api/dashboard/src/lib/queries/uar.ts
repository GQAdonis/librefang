import { queryOptions, useQuery } from "@tanstack/react-query";
import { getUarModels, getUarStatus } from "../http/client";
import { uarKeys } from "./keys";

export const uarStatusQueryOptions = () =>
  queryOptions({
    queryKey: uarKeys.detail(),
    queryFn: getUarStatus,
    refetchInterval: 5_000,
  });

export function useUarStatus() {
  return useQuery(uarStatusQueryOptions());
}

export function useUarModels(enabled: boolean) {
  return useQuery({
    queryKey: uarKeys.models(),
    queryFn: getUarModels,
    enabled,
  });
}
