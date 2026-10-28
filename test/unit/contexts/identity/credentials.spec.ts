import { describe, expect, test } from 'vitest';
import { isValidCpf, maskCpf, passwordRules, signupSchema } from '@/contexts/identity/domain/credentials';

const valid = { name: 'Ana Souza', email: 'ana@example.com', document: '529.982.247-25', password: 'Abcdefg1' };

describe('Signup rules', () => {
  test('Should accept a valid signup and send the CPF as digits only', () => {
    expect(signupSchema.parse(valid)).toEqual({ ...valid, document: '52998224725' });
  });

  test.each([
    ['a single name', { name: 'Ana' }, 'name'],
    ['an invalid email', { email: 'ana@' }, 'email'],
    ['a CPF with a wrong check digit', { document: '529.982.247-26' }, 'document'],
    ['a short password', { password: 'Abc1' }, 'password'],
    ['a password without uppercase', { password: 'abcdefg1' }, 'password'],
  ])('Should refuse %s', (_case, change, field) => {
    const result = signupSchema.safeParse({ ...valid, ...change });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  test('Should refuse repeated-digit CPFs and mask what the user types', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('5299')).toBe('529.9');
  });

  test('Should report each password rule as the user types', () => {
    expect(passwordRules('abc').map((rule) => rule.satisfied)).toEqual([false, true, false, false]);
    expect(passwordRules('Abcdefg1').every((rule) => rule.satisfied)).toBe(true);
  });
});
