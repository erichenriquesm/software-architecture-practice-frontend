import { computed, reactive, ref } from 'vue';
import type { z } from 'zod';

export interface UseFormOutput<TValues extends Record<string, string>, TParsed> {
  readonly values: TValues;
  readonly errors: Readonly<Partial<Record<keyof TValues, string>>>;
  readonly submitted: Readonly<{ value: boolean }>;
  readonly isValid: Readonly<{ value: boolean }>;
  touch(field: keyof TValues): void;
  /** Validates everything; returns the parsed values, or undefined and shows every error. */
  validate(): TParsed | undefined;
}

/** Form state for a Zod schema: errors show after a field is touched (blur) or after a submit attempt. */
export const useForm = <TValues extends Record<string, string>, TParsed>(schema: z.ZodType<TParsed, TValues>, initial: TValues): UseFormOutput<TValues, TParsed> => {
  const values = reactive({ ...initial }) as TValues;
  const touched = reactive(new Set()) as Set<keyof TValues>;
  const submitted = ref(false);

  const issues = computed(() => {
    const result = schema.safeParse({ ...values });
    if (result.success) return new Map<keyof TValues, string>();
    const byField = new Map<keyof TValues, string>();
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TValues;
      if (!byField.has(field)) byField.set(field, issue.message);
    }
    return byField;
  });

  const errors = computed(() => {
    const visible: Partial<Record<keyof TValues, string>> = {};
    for (const [field, message] of issues.value) {
      if (submitted.value || touched.has(field)) visible[field] = message;
    }
    return visible;
  });

  return {
    values,
    get errors() {
      return errors.value;
    },
    submitted,
    isValid: computed(() => issues.value.size === 0),
    touch: (field) => touched.add(field),
    validate: () => {
      submitted.value = true;
      const result = schema.safeParse({ ...values });
      return result.success ? result.data : undefined;
    },
  };
};
