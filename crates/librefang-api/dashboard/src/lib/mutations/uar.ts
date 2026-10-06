import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reconnectUar, connectUar, disconnectUar, testUar } from "../http/client";
import { uarKeys } from "../queries/keys";

function useLifecycleMutation(mutationFn: () => ReturnType<typeof connectUar>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: uarKeys.all });
    },
  });
}

export function useStartUar() {
  return useLifecycleMutation(connectUar);
}

export function useStopUar() {
  return useLifecycleMutation(disconnectUar);
}

export function useRestartUar() {
  return useLifecycleMutation(reconnectUar);
}

export function useTestUar() {
  return useMutation({
    mutationFn: testUar,
  });
}
