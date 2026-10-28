import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { useIdentityApi } from './identityApiProvider';
import { useSessionStore } from './sessionStore';

/** Ends the session on the server, forgets every cached query and the signed-in user. */
export const useLogout = (options: { onSignedOut: () => void }) => {
  const api = useIdentityApi();
  const session = useSessionStore();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.logout(),
    onSettled: () => {
      queryClient.clear();
      session.signedOut();
      options.onSignedOut();
    },
  });

  return { logout: () => mutation.mutate(), pending: mutation.isPending };
};
