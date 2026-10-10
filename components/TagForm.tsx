'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitTagPickup } from '@/app/actions';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

export default function TagForm() {
  const [state, action, pending] = useActionState(submitTagPickup, initial);
  const v = state.values ?? {};
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');

  if (state.status === 'ok') {
    return (
      <div className="panel">
        <h2 className="h-sm">Thank you for taking a tag.</h2>
        <p>We have your name down for it. Neighbors like you make this possible.</p>
        <Link className="btn ghost" href="/">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="field">
        <label htmlFor="tags">Which tag did you take?</label>
        <input id="tags" name="tags" type="text" defaultValue={str('tags')} required />
        <span className="hint">
          Enter the number or name written on the tag. If you took more than one, list them all.
        </span>
      </div>

      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" type="text" autoComplete="name" defaultValue={str('name')} required />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={str('phone')} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={str('email')} />
        </div>
      </div>
      <p className="fine">Give us at least one way to reach you.</p>

      <div className="field">
        <label htmlFor="notes">
          Notes <span className="hint">(optional)</span>
        </label>
        <textarea id="notes" name="notes" defaultValue={str('notes')} />
      </div>

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? 'Sending...' : 'Save my tag'}
        </button>
      </div>
    </form>
  );
}
