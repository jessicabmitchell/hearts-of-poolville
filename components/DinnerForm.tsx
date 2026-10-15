'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitDinner } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import type { Holiday } from '@/lib/programs';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

export default function DinnerForm({
  holiday,
  lang,
  pickupDay,
}: {
  holiday: Holiday;
  lang: Lang;
  pickupDay: string | null;
}) {
  const [state, action, pending] = useActionState(submitDinner, initial);
  const v = state.values ?? {};
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const [forWho, setForWho] = useState(str('for_who'));
  const [pickup, setPickup] = useState(str('pickup'));
  const c = dict(lang).common;
  const t = dict(lang).dinner;
  const home = lang === 'es' ? '/?lang=es' : '/';

  if (state.status === 'ok') {
    return (
      <div className="panel">
        <h2 className="h-sm">{t.thanks}</h2>
        <p>
          {pickupDay ? (
            <>
              {t.thanksBody} <strong>{pickupDay}</strong>.
            </>
          ) : (
            t.thanksTbd
          )}
        </p>
        <Link className="btn ghost" href={home}>
          {c.backHome}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="holiday" value={holiday} />
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend>{t.forWho}</legend>
        <label className="check">
          <input
            type="radio"
            name="for_who"
            value="self"
            defaultChecked={forWho === 'self'}
            onChange={() => setForWho('self')}
            required
          />
          <span>{t.forSelf}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="for_who"
            value="other"
            defaultChecked={forWho === 'other'}
            onChange={() => setForWho('other')}
          />
          <span>{t.forOther}</span>
        </label>
      </fieldset>

      {forWho && (
        <>
          <h2 className="h-sm">{t.contactHeading}</h2>

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

          <fieldset>
            <legend>{t.pickupQ}</legend>
            <label className="check">
              <input
                type="radio"
                name="pickup"
                value="me"
                defaultChecked={pickup === 'me'}
                onChange={() => setPickup('me')}
                required
              />
              <span>{t.pickupMe}</span>
            </label>
            <label className="check">
              <input
                type="radio"
                name="pickup"
                value="other"
                defaultChecked={pickup === 'other'}
                onChange={() => setPickup('other')}
              />
              <span>{t.pickupOther}</span>
            </label>
          </fieldset>

          {pickup === 'other' && (
            <div className="field">
              <label htmlFor="pickup_name">{t.pickupName}</label>
              <input id="pickup_name" name="pickup_name" type="text" defaultValue={str('pickup_name')} required />
            </div>
          )}

          {forWho === 'self' ? (
            <h2 className="h-sm">{t.selfHeading}</h2>
          ) : (
            <>
              <h2 className="h-sm">{t.recipientHeading}</h2>
              <p className="fine">{t.recipientHint}</p>
              <div className="field">
                <label htmlFor="recipient_name">{t.recipientName}</label>
                <input
                  id="recipient_name"
                  name="recipient_name"
                  type="text"
                  defaultValue={str('recipient_name')}
                  required
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="household">{t.familySize}</label>
            <input
              id="household"
              name="household"
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              defaultValue={str('household')}
              required
            />
            <span className="hint">{t.familySizeHint}</span>
          </div>

          <div className="field">
            <label htmlFor="address">
              {t.address} <span className="hint">{c.optional}</span>
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              autoComplete={forWho === 'self' ? 'street-address' : 'off'}
              defaultValue={str('address')}
            />
          </div>

          {forWho === 'other' && (
            <div className="row2">
              <div className="field">
                <label htmlFor="recipient_phone">
                  {t.recipientPhone} <span className="hint">{c.optional}</span>
                </label>
                <input id="recipient_phone" name="recipient_phone" type="tel" defaultValue={str('recipient_phone')} />
              </div>
              <div className="field">
                <label htmlFor="recipient_email">
                  {t.recipientEmail} <span className="hint">{c.optional}</span>
                </label>
                <input
                  id="recipient_email"
                  name="recipient_email"
                  type="email"
                  defaultValue={str('recipient_email')}
                />
              </div>
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
        </>
      )}
    </form>
  );
}
