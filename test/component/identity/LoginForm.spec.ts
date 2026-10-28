import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { LoginForm, useSessionStore } from '@/contexts/identity';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';

const me = { accountId: '0199d5f4-2b9a-7c3e-9a51-2f1d3c4b5a69', name: 'Ana Souza', email: 'ana@example.com' };

const fillAndSubmit = async (email: string, password: string) => {
  await fireEvent.update(screen.getByLabelText('E-mail'), email);
  await fireEvent.update(screen.getByLabelText('Senha'), password);
  await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
};

describe('Login form', () => {
  test('Should sign in, load /me into the session and tell the page', async () => {
    // Given
    server.use(
      http.post('/login', () => new HttpResponse(null, { status: 204 })),
      http.get('/me', () => HttpResponse.json(me)),
    );
    const { emitted } = await renderWithApp(LoginForm);

    // When
    await fillAndSubmit('ana@example.com', 'Abcdefg1');

    // Then
    await waitFor(() => expect(emitted().signedIn).toHaveLength(1));
    expect(useSessionStore().user).toEqual(me);
  });

  test('Should show one message for wrong credentials, whatever the reason', async () => {
    server.use(http.post('/login', () => HttpResponse.json({ error: 'invalidCredentials' }, { status: 401 })));
    await renderWithApp(LoginForm);

    await fillAndSubmit('ana@example.com', 'wrong');

    expect((await screen.findByRole('alert')).textContent).toContain('E-mail ou senha incorretos.');
  });

  test('Should lock the form and say how long to wait when the account is blocked', async () => {
    server.use(http.post('/login', () => HttpResponse.json({ error: 'tooManyLoginAttempts' }, { status: 429, headers: { 'retry-after': '3120' } })));
    await renderWithApp(LoginForm);

    await fillAndSubmit('ana@example.com', 'wrong');

    expect((await screen.findByRole('alert')).textContent).toContain('Tente de novo em 52 min.');
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('Should not call the API while required fields are empty', async () => {
    await renderWithApp(LoginForm);

    await fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Informe seu e-mail.')).toBeTruthy();
  });
});
