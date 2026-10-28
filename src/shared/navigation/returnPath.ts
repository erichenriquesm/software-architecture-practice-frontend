/** Only an in-app path, never an absolute URL, so a crafted ?voltar= cannot send the user to another site. */
export const safeReturnPath = (value: unknown): string => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/');

/** Added to /entrar when a request found the session over, so the sign-in screen can say why the user is there. */
export const sessionEndedReason = { motivo: 'sessao' } as const;
export const isSessionEnded = (query: Readonly<Record<string, unknown>>): boolean => query.motivo === sessionEndedReason.motivo;
