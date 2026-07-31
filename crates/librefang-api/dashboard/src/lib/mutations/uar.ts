import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restartUar, startUar, stopUar, testUar } from "../http/client";
import { uarKeys } from "../queries/keys";

function useLifecycleMutation(mutationFn: () => ReturnType<typeof startUar>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: uarKeys.all });
    },
  });
}

export function useStartUar() {
  return useLifecycleMutation(startUar);
}

export function useStopUar() {
  return useLifecycleMutation(stopUar);
}

export function useRestartUar() {
  return useLifecycleMutation(restartUar);
}

export function useTestUar() {
  return useMutation({
    mutationFn: testUar,
  });
}
