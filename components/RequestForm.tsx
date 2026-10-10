'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitRequest } from '@/app/actions';
import type { FormState } from '@/lib/types';

type Option = { id: string; name: string; open: boolean };

const initial: FormState = { status: 'idle' };

export default function RequestForm({ programs }: { programs: Option[] }) {
  const [state, action, pending] = useActionState(submitRequest, initial);
  const v = state.values ?? {};
  const chosen = Array.isArray(v.programs) ? v.programs : [];
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');

  if (state.status === 'ok') {
    return (
      <div className="panel">
        <h2 className="h-sm">Thank you. We got your request.</h2>
        <p>We will use the contact information you gave us to follow up.</p>
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

      <fieldset>
        <legend>What does your household need help with?</legend>
        {programs.map((p) => (
          <label key={p.id} className={p.open ? 'check' : 'check off'}>
            <input
              type="checkbox"
              name="programs"
              value={p.id}
              defaultChecked={chosen.includes(p.id)}
              disabled={!p.open}
            />
            <span>
              {p.name}
              {!p.open && <em> &middot; not taking requests right now</em>}
            </span>
          </label>
        ))}
      </fieldset>

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
        <label htmlFor="address">
          Address <span className="hint">(only if we may need to bring something to you)</span>
        </label>
        <input id="address" name="address" type="text" autoComplete="street-address" defaultValue={str('address')} />
      </div>

      <div className="field">
        <label htmlFor="household">How many people live in your household?</label>
        <input id="household" name="household" type="number" min={1} max={30} inputMode="numeric" defaultValue={str('household')} required />
      </div>

      <div className="field">
        <label htmlFor="details">
          Anything else we should know? <span className="hint">(optional)</span>
        </label>
        <textarea id="details" name="details" defaultValue={str('details')} />
        <span className="hint">
          For the Angel Tree or Easter baskets, you can list your children&apos;s first names, ages, and sizes here.
        </span>
      </div>

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? 'Sending...' : 'Send request'}
        </button>
      </div>
      <p className="fine">What you send here goes only to Hearts of Poolville.</p>
    </form>
  );
}
