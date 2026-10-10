'use client';

import { useActionState } from 'react';
import { signIn } from '@/app/admin/actions';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
