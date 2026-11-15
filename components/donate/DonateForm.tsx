'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitPledge } from '@/app/donate/actions';
import { dict, type Lang } from '@/lib/i18n';
import type { FormState } from '@/lib/types';

export type DonateItem = { id: string; name: string; unit: string; left: number };
export type DonateSlot = { id: string; label: string; place: string; spotsLeft: number | null };

const initial: FormState = { status: 'idle' };

export default function DonateForm({
  event,
  lang,
  items,
  slots,
}: {
  event: string;
  lang: Lang;
  items: DonateItem[];
  slots: DonateSlot[];
}) {
  const [state, action, pending] = useActionState(submitPledge, initial);
  const d = dict(lang);
  const t = d.donate;
  const v = state.values ?? {};
  const str = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : '');

  if (state.status === 'ok') {
    const bring = Array.isArray(v.bring) ? v.bring : [];
    return (
      <div className="panel donate-thanks">
        <h2 className="h-sm">{t.thanksTitle}</h2>
        {str('code') && (
          <p>
            {t.yourCode}: <strong className="donate-code">{str('code')}</strong>
          </p>
        )}
        {bring.length > 0 && (
          <>
            <p>{t.bring}:</p>
            <ul>
              {bring.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </>
        )}
        {str('slot') && (
          <p>
            {t.dropOff}: <strong>{str('slot')}</strong>
            {str('place') ? ` · ${str('place')}` : ''}
          </p>
        )}
        <p className="fine">{t.showCode}</p>
        <Link className="btn ghost" href={lang === 'es' ? '/?lang=es' : '/'}>
          {d.common.backHome}
        </Link>
      </div>
    );
  }

  const anyNeeded = items.some((i) => i.left > 0);

  return (
    <form action={action} className="form">
      <input type="hidden" name="event" value={event} />
      <input type="hidden" name="lang" value={lang} />
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend>{t.itemsLegend}</legend>
        {!anyNeeded && <p className="fine">{t.allCovered}</p>}
        <div className="donate-items">
          {items.map((i) => (
            <div key={i.id} className={i.left > 0 ? 'donate-item' : 'donate-item covered'}>
              <label htmlFor={`item_${i.id}`}>
                <strong>{i.name}</strong>
                <span className="fine">
                  {i.left > 0 ? `${i.left} ${i.unit} ${t.stillNeeded}` : t.covered}
                </span>
              </label>
              {i.left > 0 && (
                <input
                  id={`item_${i.id}`}
                  name={`item_${i.id}`}
                  type="number"
                  min={0}
                  max={i.left}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label={`${t.howMany}: ${i.name}`}
                  defaultValue={str(`item_${i.id}`)}
                />
              )}
            </div>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="other">
          {t.otherLabel} <span className="hint">{d.common.optional}</span>
        </label>
        <textarea id="other" name="other" defaultValue={str('other')} />
      </div>

      <fieldset>
        <legend>{t.slotLegend}</legend>
        {slots.map((s, i) => (
          <label key={s.id} className="check">
            <input type="radio" name="slot" value={s.id} defaultChecked={str('slot') === s.id} required={i === 0} />
            <span>
              {s.label}
              {s.place && <em> · {s.place}</em>}
              {s.spotsLeft !== null && (
                <em>
                  {' '}
                  · {s.spotsLeft} {t.spotsLeft}
                </em>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <h2 className="h-sm">{t.contactHeading}</h2>
      <div className="field">
        <label htmlFor="name">{t.name}</label>
        <input id="name" name="name" type="text" autoComplete="name" defaultValue={str('name')} required />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="phone">{t.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={str('phone')} />
        </div>
        <div className="field">
          <label htmlFor="email">{t.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={str('email')} />
        </div>
      </div>
      <p className="fine">{d.common.oneWay}</p>

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? d.common.sending : t.submit}
        </button>
      </div>
      <p className="fine">{d.common.privacy}</p>
    </form>
  );
}
