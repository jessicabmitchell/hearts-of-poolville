export type FormState = {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  values?: Record<string, string | string[]>;
};
