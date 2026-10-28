export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly context: string;
  readonly message: string;
  readonly accountId: string | null;
  readonly [field: string]: unknown;
}

export type LogSink = (entry: LogEntry) => void;

let currentAccountId: string | null = null;
let sink: LogSink = (entry) => {
  if (import.meta.env.PROD && entry.level === 'debug') return;
  // The browser console is the only sink in this proof of concept; an APM would replace this function.
  // eslint-disable-next-line no-console
  console[entry.level](JSON.stringify(entry));
};

export const setLogAccount = (accountId: string | undefined): void => {
  currentAccountId = accountId ?? null;
};

export const setLogSink = (next: LogSink): void => {
  sink = next;
};

/** Structured logs; never pass passwords, CPF or cookies in fields. */
export const createLogger = (context: string) => {
  const log = (level: LogLevel) => (message: string, fields: Record<string, unknown> = {}) =>
    sink({ timestamp: new Date().toISOString(), level, context, message, accountId: currentAccountId, ...fields });
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
};
