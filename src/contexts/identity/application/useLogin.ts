import { useMutation } from '@tanstack/vue-query';
import { computed } from 'vue';
import { isApiError } from '@/shared/api/apiError';
import { useForm } from '@/shared/forms/useForm';
import { loginSchema } from '../domain/credentials';
import type { LoginValues } from '../domain/credentials';
import { authErrorMessage } from './authErrors';
import { useIdentityApi } from './identityApiProvider';
import { useSessionStore } from './sessionStore';

export const useLogin = (options: { onSignedIn: () => void }) => {
  const api = useIdentityApi();
  const session = useSessionStore();
  const form = useForm<LoginValues, LoginValues>(loginSchema, { email: '', password: '' });

  const mutation = useMutation({
    meta: { expectsUnauthenticated: true },
    mutationFn: async (credentials: LoginValues) => {
      await api.login({ email: credentials.email.trim(), password: credentials.password });
      return api.me();
    },
    onSuccess: (me) => {
      session.signedIn(me);
      options.onSignedIn();
    },
  });

  const submit = () => {
    const credentials = form.validate();
    if (!credentials) return;
    mutation.mutate(credentials);
  };

  return {
    form,
    submit,
    pending: mutation.isPending,
    errorMessage: computed(() => authErrorMessage(mutation.error.value)),
    blocked: computed(() => isApiError(mutation.error.value) && mutation.error.value.kind === 'rateLimited'),
  };
};
