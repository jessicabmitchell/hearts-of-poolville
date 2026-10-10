'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitAngelTree } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

type FieldProps = {
  id: string;
  label: string;
  value: string;
  optional?: string;
  required?: boolean;
  long?: boolean;
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
};

function Field({ id, label, value, optional, required, long, type = 'text', autoComplete }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="hint">{optional}</span>}
      </label>
      {long ? (
        <textarea id={id} name={id} defaultValue={value} autoComplete={autoComplete} />
      ) : (
        <input id={id} name={id} type={type} defaultValue={value} autoComplete={autoComplete} required={required} />
      )}
    </div>
  );
}

export default function AngelTreeForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(submitAngelTree, initial);
  // Set to the result of a submission once the person chooses to sign up another child.
  const [againFrom, setAgainFrom] = useState<FormState | null>(null);
  const v = state.values ?? {};
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const [forWho, setForWho] = useState(str('for_who'));
  const [pickup, setPickup] = useState(str('pickup'));
  const [bedding, setBedding] = useState(str('bedding'));
  const c = dict(lang).common;
  const t = dict(lang).angelApp;
  const opt = c.optional;

  if (state.status === 'ok' && againFrom !== state) {
    return (
      <div className="panel">
        <h2 className="h-sm">
          {t.thanks} {state.message}.
        </h2>
        <p>{t.thanksBody}</p>
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setBedding('');
              setAgainFrom(state);
              window.scrollTo(0, 0);
            }}
          >
            {t.another}
          </button>
          <Link className="btn ghost" href={lang === 'es' ? '/?lang=es' : '/'}>
            {c.backHome}
          </Link>
        </div>
        <p className="fine">{t.anotherHint}</p>
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
        <legend>{t.forWho}</legend>
        <label className="check">
          <input
            type="radio"
            name="for_who"
            value="other"
            defaultChecked={forWho === 'other'}
            onChange={() => setForWho('other')}
            required
          />
          <span>{t.yes}</span>
        </label>
        <label className="check">
          <input
            type="radio"
            name="for_who"
            value="self"
            defaultChecked={forWho === 'self'}
            onChange={() => setForWho('self')}
          />
          <span>{t.no}</span>
        </label>
      </fieldset>

      {forWho && (
        <>
          <h2 className="h-sm">{t.contactHeading}</h2>
          <Field id="name" label={c.name} value={str('name')} autoComplete="name" required />
          <div className="row2">
            <Field id="phone" label={c.phone} value={str('phone')} type="tel" autoComplete="tel" />
            <Field id="email" label={c.email} value={str('email')} type="email" autoComplete="email" />
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
          {pickup === 'other' && <Field id="pickup_name" label={t.pickupName} value={str('pickup_name')} required />}

          {forWho === 'other' ? (
            <>
              <h2 className="h-sm">{t.parentHeading}</h2>
              <Field id="parent_name" label={t.parentName} value={str('parent_name')} required />
              <div className="row2">
                <Field id="parent_phone" label={t.parentPhone} value={str('parent_phone')} type="tel" optional={opt} />
                <Field
                  id="parent_email"
                  label={t.parentEmail}
                  value={str('parent_email')}
                  type="email"
                  optional={opt}
                />
              </div>
              <Field id="address" label={t.address} value={str('address')} optional={opt} long />
            </>
          ) : (
            <Field
              id="address"
              label={t.address}
              value={str('address')}
              optional={opt}
              autoComplete="street-address"
              long
            />
          )}

          <h2 className="h-sm">{t.childHeading}</h2>
          <div className="row2">
            <Field id="child_name" label={t.childName} value={str('child_name')} required />
            <Field id="age" label={t.age} value={str('age')} required />
          </div>

          <fieldset>
            <legend>
              {t.gender} <span className="hint">{opt}</span>
            </legend>
            <label className="check">
              <input type="radio" name="gender" value="male" defaultChecked={str('gender') === 'male'} />
              <span>{t.male}</span>
            </label>
            <label className="check">
              <input type="radio" name="gender" value="female" defaultChecked={str('gender') === 'female'} />
              <span>{t.female}</span>
            </label>
          </fieldset>

          <div className="row2">
            <Field id="shirt" label={t.shirt} value={str('shirt')} optional={opt} />
            <Field id="jeans" label={t.jeans} value={str('jeans')} optional={opt} />
          </div>
          <div className="row2">
            <Field id="shoe" label={t.shoe} value={str('shoe')} optional={opt} />
            <Field id="coat" label={t.coat} value={str('coat')} optional={opt} />
          </div>

          <fieldset>
            <legend>
              {t.bedding} <span className="hint">{opt}</span>
            </legend>
            {(Object.keys(t.beddingOptions) as (keyof typeof t.beddingOptions)[]).map((size) => (
              <label key={size} className="check">
                <input
                  type="radio"
                  name="bedding"
                  value={size}
                  defaultChecked={bedding === size}
                  onChange={() => setBedding(size)}
                />
                <span>{t.beddingOptions[size]}</span>
              </label>
            ))}
            <label className="check">
              <input
                type="radio"
                name="bedding"
                value="other"
                defaultChecked={bedding === 'other'}
                onChange={() => setBedding('other')}
              />
              <span>{t.other}</span>
            </label>
          </fieldset>
          {bedding === 'other' && (
            <Field id="bedding_other" label={t.otherBedding} value={str('bedding_other')} />
          )}

          <Field id="interests" label={t.interests} value={str('interests')} optional={opt} long />
          <Field id="color" label={t.color} value={str('color')} optional={opt} />
          <Field id="wishes" label={t.wishes} value={str('wishes')} optional={opt} long />

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
