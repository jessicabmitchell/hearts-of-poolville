'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitAngelTree } from '@/app/actions';
import { dict, type Dict, type Lang } from '@/lib/i18n';
import type { FormState } from '@/lib/types';

const initial: FormState = { status: 'idle' };

/** Most children one form can hold. Keep in step with MAX_CHILDREN in app/actions.ts. */
const MAX_CHILDREN = 10;

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

/** One child's questions. Every field name starts with `c<key>_` so the server can tell children apart. */
function ChildFields({
  childKey,
  number,
  str,
  t,
  opt,
  onRemove,
}: {
  childKey: string;
  number: number;
  str: (key: string) => string;
  t: Dict['angelApp'];
  opt: string;
  onRemove?: () => void;
}) {
  const f = (name: string) => `c${childKey}_${name}`;
  const [bedding, setBedding] = useState(str(f('bedding')));

  return (
    <div className="form child">
      <div className="child-head">
        <h2 className="h-sm">
          {t.childHeading} {number}
        </h2>
        {onRemove && (
          <button className="btn ghost small" type="button" onClick={onRemove}>
            {t.removeChild}
          </button>
        )}
      </div>

      <div className="row2">
        <Field id={f('name')} label={t.childName} value={str(f('name'))} required />
        <Field id={f('age')} label={t.age} value={str(f('age'))} required />
      </div>

      <fieldset>
        <legend>
          {t.gender} <span className="hint">{opt}</span>
        </legend>
        <label className="check">
          <input type="radio" name={f('gender')} value="male" defaultChecked={str(f('gender')) === 'male'} />
          <span>{t.male}</span>
        </label>
        <label className="check">
          <input type="radio" name={f('gender')} value="female" defaultChecked={str(f('gender')) === 'female'} />
          <span>{t.female}</span>
        </label>
      </fieldset>

      <div className="row2">
        <Field id={f('shirt')} label={t.shirt} value={str(f('shirt'))} optional={opt} />
        <Field id={f('jeans')} label={t.jeans} value={str(f('jeans'))} optional={opt} />
      </div>
      <div className="row2">
        <Field id={f('shoe')} label={t.shoe} value={str(f('shoe'))} optional={opt} />
        <Field id={f('coat')} label={t.coat} value={str(f('coat'))} optional={opt} />
      </div>

      <fieldset>
        <legend>
          {t.bedding} <span className="hint">{opt}</span>
        </legend>
        {(Object.keys(t.beddingOptions) as (keyof typeof t.beddingOptions)[]).map((size) => (
          <label key={size} className="check">
            <input
              type="radio"
              name={f('bedding')}
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
            name={f('bedding')}
            value="other"
            defaultChecked={bedding === 'other'}
            onChange={() => setBedding('other')}
          />
          <span>{t.other}</span>
        </label>
      </fieldset>
      {bedding === 'other' && <Field id={f('bedding_other')} label={t.otherBedding} value={str(f('bedding_other'))} />}

      <Field id={f('interests')} label={t.interests} value={str(f('interests'))} optional={opt} long />
      <Field id={f('color')} label={t.color} value={str(f('color'))} optional={opt} />
      <Field id={f('wishes')} label={t.wishes} value={str(f('wishes'))} optional={opt} long />
    </div>
  );
}

export default function AngelTreeForm({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(submitAngelTree, initial);
  const v = state.values ?? {};
  const str = (key: string) => (typeof v[key] === 'string' ? (v[key] as string) : '');
  const [forWho, setForWho] = useState(str('for_who'));
  const [pickup, setPickup] = useState(str('pickup'));
  const [childKeys, setChildKeys] = useState<string[]>(['0']);
  const [nextKey, setNextKey] = useState(1);
  const c = dict(lang).common;
  const t = dict(lang).angelApp;
  const opt = c.optional;

  if (state.status === 'ok') {
    const names = Array.isArray(v.child_names) ? v.child_names : [];
    return (
      <div className="panel">
        <h2 className="h-sm">{t.thanks}</h2>
        {names.length > 0 && (
          <p>
            {t.thanksFor} <strong>{names.join(', ')}</strong>
          </p>
        )}
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

          {childKeys.map((key, i) => (
            <div key={key}>
              <input type="hidden" name="child_keys" value={key} />
              <ChildFields
                childKey={key}
                number={i + 1}
                str={str}
                t={t}
                opt={opt}
                onRemove={childKeys.length > 1 ? () => setChildKeys(childKeys.filter((k) => k !== key)) : undefined}
              />
            </div>
          ))}

          {childKeys.length < MAX_CHILDREN && (
            <div>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setChildKeys([...childKeys, String(nextKey)]);
                  setNextKey(nextKey + 1);
                }}
              >
                + {t.addChild}
              </button>
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
