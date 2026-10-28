import { useMutation } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useForm } from '@/shared/forms/useForm';
import { passwordRules, signupSchema } from '../domain/credentials';
import type { SignupFields, SignupValues } from '../domain/credentials';
import { authErrorMessage } from './authErrors';
import { useIdentityApi } from './identityApiProvider';
import { useSessionStore } from './sessionStore';

/** Signs up, then signs in with the same credentials, so a new user lands in the app. */
export const useSignup = (options: { onSignedIn: () => void }) => {
  const api = useIdentityApi();
  const session = useSessionStore();
  const form = useForm<SignupValues, SignupFields>(signupSchema, { name: '', email: '', document: '', password: '' });

  const mutation = useMutation({
    mutationFn: async (fields: SignupFields) => {
      await api.signup(fields);
      await api.login({ email: fields.email, password: fields.password });
      return api.me();
    },
    onSuccess: (me) => {
      session.signedIn(me);
      options.onSignedIn();
    },
  });

  const submit = () => {
    const fields = form.validate();
    if (!fields) return;
    mutation.mutate(fields);
  };

  return {
    form,
    submit,
    pending: mutation.isPending,
    passwordRules: computed(() => passwordRules(form.values.password)),
    errorMessage: computed(() => authErrorMessage(mutation.error.value)),
  };
};
