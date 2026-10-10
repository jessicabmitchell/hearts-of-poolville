'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitRequest } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import type { FormState } from '@/lib/types';

type Option = { id: string; name: string; open: boolean };

const initial: FormState = { status: 'idle' };

export default function RequestForm({ programs, lang }: { programs: Option[]; lang: Lang }) {
  const [state, action, pending] = useActionState(submitRequest, initial);
  const v = state.values ?? {};
  const chosen = Array.isArray(v.programs) ? v.programs : [];
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const c = dict(lang).common;
  const t = dict(lang).request;

  if (state.status === 'ok') {
    return (
      <div className="panel">
        <h2 className="h-sm">{t.thanks}</h2>
        <p>{t.thanksBody}</p>
        <Link className="btn ghost" href={lang === 'es' ? '/?lang=es' : '/'}>
          {c.backHome}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <input type="hidden" name="lang" value={lang} />
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend>{t.programsLegend}</legend>
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
              {!p.open && <em> &middot; {t.notTaking}</em>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="name">{c.name}</label>
        <input id="name" name="name" type="text" autoComplete="name" defaultValue={str('name')} required />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="phone">{c.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={str('phone')} />
        </div>
        <div className="field">
          <label htmlFor="email">{c.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={str('email')} />
        </div>
      </div>
      <p className="fine">{c.oneWay}</p>

      <div className="field">
        <label htmlFor="address">
          {t.address} <span className="hint">{t.addressHint}</span>
        </label>
        <input id="address" name="address" type="text" autoComplete="street-address" defaultValue={str('address')} />
      </div>

      <div className="field">
        <label htmlFor="household">{t.household}</label>
        <input id="household" name="household" type="number" min={1} max={30} inputMode="numeric" defaultValue={str('household')} required />
      </div>

      <div className="field">
        <label htmlFor="details">
          {t.details} <span className="hint">{c.optional}</span>
        </label>
        <textarea id="details" name="details" defaultValue={str('details')} />
        <span className="hint">{t.detailsHint}</span>
      </div>

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? c.sending : t.submit}
        </button>
      </div>
      <p className="fine">{c.privacy}</p>
    </form>
  );
}
