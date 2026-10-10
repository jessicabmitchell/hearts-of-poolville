'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitTagPickup } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

export default function TagForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(submitTagPickup, initial);
  const v = state.values ?? {};
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const c = dict(lang).common;
  const t = dict(lang).tag;

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
        <label htmlFor="tags">{t.tags}</label>
        <input id="tags" name="tags" type="text" defaultValue={str('tags')} required />
        <span className="hint">{t.tagsHint}</span>
      </div>

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
        <label htmlFor="notes">
          {t.notes} <span className="hint">{c.optional}</span>
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
          {pending ? c.sending : t.submit}
        </button>
      </div>
    </form>
  );
}
