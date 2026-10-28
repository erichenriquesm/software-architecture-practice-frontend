import { z } from 'zod';

const required = (message: string) => z.string().trim().min(1, message);

/** Same rules the account service enforces (sdd/objective.md, Signup); the backend stays the authority. */
export const signupSchema = z.object({
  name: required('Informe seu nome completo.').refine((name) => name.split(/\s+/).filter(Boolean).length >= 2, 'Informe nome e sobrenome.'),
  email: required('Informe seu e-mail.').pipe(z.email('Informe um e-mail válido, como nome@dominio.com.')),
  document: required('Informe seu CPF.')
    .transform((document) => document.replace(/\D/g, ''))
    .refine((digits) => isValidCpf(digits), 'Informe um CPF válido.'),
  password: z
    .string()
    .min(8, 'A senha precisa de ao menos 8 caracteres.')
    .regex(/[a-z]/, 'A senha precisa de uma letra minúscula.')
    .regex(/[A-Z]/, 'A senha precisa de uma letra maiúscula.')
    .regex(/\d/, 'A senha precisa de um número.'),
});

export type SignupValues = z.input<typeof signupSchema>;
export type SignupFields = z.output<typeof signupSchema>;

export const loginSchema = z.object({
  email: required('Informe seu e-mail.'),
  password: required('Informe sua senha.'),
});

export type LoginValues = z.input<typeof loginSchema>;

export interface PasswordRule {
  readonly label: string;
  readonly satisfied: boolean;
}

export const passwordRules = (password: string): readonly PasswordRule[] => [
  { label: 'Ao menos 8 caracteres', satisfied: password.length >= 8 },
  { label: 'Uma letra minúscula', satisfied: /[a-z]/.test(password) },
  { label: 'Uma letra maiúscula', satisfied: /[A-Z]/.test(password) },
  { label: 'Um número', satisfied: /\d/.test(password) },
];

const checkDigit = (digits: string, length: number): number => {
  const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

export const isValidCpf = (digits: string): boolean => {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  return checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10]);
};

/** Visual mask only: 52998224725 -> 529.982.247-25. */
export const maskCpf = (typed: string): string => {
  const digits = typed.replace(/\D/g, '').slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
};
