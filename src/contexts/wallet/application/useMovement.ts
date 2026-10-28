import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { AssetId } from '@/entities/market';
import { isRetryable } from '@/shared/api/apiError';
import { newIdempotencyKey } from '@/shared/api/idempotency';
import { useForm } from '@/shared/forms/useForm';
import { movementSchema } from '../domain/movement';
import type { Movement, MovementKind, MovementValues } from '../domain/movement';
import { movementErrorMessage } from './movementErrors';
import { balancesQueryKey, useBalances } from './useBalances';
import { useWalletApi } from './walletApiProvider';

export interface MovementInput {
  readonly kind: MovementKind;
  readonly assetId: AssetId;
  readonly quantity: string;
  readonly idempotencyKey: string;
}

export type MovementOutput = Omit<MovementInput, 'idempotencyKey'>;

const sameMovement = (first: MovementOutput, second: MovementOutput) => first.kind === second.kind && first.assetId === second.assetId && first.quantity === second.quantity;

/** Deposit or withdraw from the signed-in account. Balances are projected asynchronously, so success refetches them. */
export const useMovement = (accountId: MaybeRefOrGetter<string | undefined>) => {
  const api = useWalletApi();
  const queryClient = useQueryClient();
  const { availableOf } = useBalances(accountId);
  const kind = ref<MovementKind>('deposit');
  const form = useForm<MovementValues, Movement>(movementSchema(() => ({ kind: kind.value, availableOf })), { assetId: 'USD', quantity: '' });
  const done = ref<MovementOutput | undefined>(undefined);
  let lastAttempt: MovementInput | undefined;

  const mutation = useMutation({
    mutationFn: ({ kind: movementKind, assetId, quantity, idempotencyKey }: MovementInput) =>
      movementKind === 'deposit' ? api.deposit({ assetId, quantity }, idempotencyKey) : api.withdraw({ assetId, quantity }, idempotencyKey),
    onSuccess: (_response, { kind: movementKind, assetId, quantity }) => {
      done.value = { kind: movementKind, assetId, quantity };
      lastAttempt = undefined;
      void queryClient.invalidateQueries({ queryKey: balancesQueryKey(toValue(accountId) ?? '') });
    },
  });

  /** A new click is a new intent, except resending the very same movement after a failure that may have reached the server. */
  const idempotencyKeyFor = (movement: MovementOutput): string => {
    if (lastAttempt && isRetryable(mutation.error.value) && sameMovement(lastAttempt, movement)) return lastAttempt.idempotencyKey;
    return newIdempotencyKey();
  };

  const submit = () => {
    const values = form.validate();
    if (!values) return;
    const movement: MovementOutput = { kind: kind.value, ...values };
    lastAttempt = { ...movement, idempotencyKey: idempotencyKeyFor(movement) };
    done.value = undefined;
    mutation.mutate(lastAttempt);
  };

  const selectKind = (next: MovementKind) => {
    if (kind.value === next) return;
    kind.value = next;
    done.value = undefined;
    mutation.reset();
  };

  watch(() => [form.values.assetId, form.values.quantity], () => {
    done.value = undefined;
  });

  return {
    kind,
    selectKind,
    form,
    submit,
    pending: mutation.isPending,
    done,
    available: computed(() => availableOf(form.values.assetId)),
    errorMessage: computed(() => movementErrorMessage(mutation.error.value)),
  };
};
