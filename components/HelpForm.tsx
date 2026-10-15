'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitHelpOffer } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import { HELP_OPTIONS, type FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

export default function HelpForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(submitHelpOffer, initial);
  const v = state.values ?? {};
  const chosen = Array.isArray(v.help) ? v.help : [];
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const [other, setOther] = useState(chosen.includes('other'));
  const c = dict(lang).common;
  const t = dict(lang).help;

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

      <div className="field">
        <label htmlFor="name">{c.name}</label>
        <input id="name" name="name" type="text" autoComplete="name" defaultValue={str('name')} required />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="email">{c.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={str('email')} />
        </div>
        <div className="field">
          <label htmlFor="phone">{c.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={str('phone')} />
        </div>
      </div>
      <p className="fine">{c.oneWay}</p>

      <fieldset>
        <legend>{t.legend}</legend>
        {HELP_OPTIONS.map((o) => (
          <label key={o} className="check">
            <input
              type="checkbox"
              name="help"
              value={o}
              defaultChecked={chosen.includes(o)}
              onChange={o === 'other' ? (e) => setOther(e.target.checked) : undefined}
            />
            <span>{t.options[o]}</span>
          </label>
        ))}
      </fieldset>

      {other && (
        <div className="field">
          <label htmlFor="other">{t.otherWhat}</label>
          <textarea id="other" name="other" defaultValue={str('other')} required />
        </div>
      )}

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
