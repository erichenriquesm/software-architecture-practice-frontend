/** Only an in-app path, never an absolute URL, so a crafted ?voltar= cannot send the user to another site. */
export const safeReturnPath = (value: unknown): string => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/');
