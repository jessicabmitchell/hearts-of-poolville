'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { submitForm } from '@/app/actions';
import { dict, type Lang } from '@/lib/i18n';
import {
  OTHER,
  conditionMet,
  contactQuestions,
  fieldName,
  otherName,
  repeatFieldName,
  repeatKeysName,
  tx,
  type RawValues,
} from '@/lib/forms/logic';
import type { FormConfig, Question, Section } from '@/lib/forms/types';
import type { FormState } from '@/lib/types';
import RichText from './RichText';

const initial: FormState = { status: 'idle' };

/** Everything currently filled in on the form, by field name. */
function readForm(form: HTMLFormElement): RawValues {
  const out: RawValues = {};
  for (const [k, v] of new FormData(form)) {
    if (typeof v !== 'string') continue;
    const had = out[k];
    out[k] = had === undefined ? v : Array.isArray(had) ? [...had, v] : [had, v];
  }
  return out;
}

const asList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const asText = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));

function startingKeys(sections: Section[], raw: RawValues): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const s of sections) if (s.repeat) out[s.id] = asList(raw[repeatKeysName(s.id)]).length ? asList(raw[repeatKeysName(s.id)]) : ['0'];
  return out;
}

type QuestionProps = {
  q: Question;
  name: string;
  lang: Lang;
  raw: RawValues;
  snap: RawValues;
  showOptional: boolean;
};

function QuestionField({ q, name, lang, raw, snap, showOptional }: QuestionProps) {
  const c = dict(lang).common;
  const label = tx(q.label, lang);
  const help = tx(q.help, lang);
  const hint = showOptional && !q.required ? <span className="hint">{c.optional}</span> : null;
  const id = `f-${name}`;

  if (q.type === 'choice' || q.type === 'checkboxes') {
    const multiple = q.type === 'checkboxes';
    const chosen = asList(raw[name]);
    const options = [...q.options.map((o) => ({ id: o.id, label: tx(o.label, lang) })), ...(q.other ? [{ id: OTHER, label: c.other }] : [])];
    const otherPicked = asList(snap[name]).includes(OTHER);
    return (
      <>
        <fieldset>
          <legend>
            {label} {hint}
          </legend>
          {help && <span className="hint">{help}</span>}
          {options.map((o, i) => (
            <label key={o.id} className="check">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={o.id}
                defaultChecked={chosen.includes(o.id)}
                required={!multiple && q.required && i === 0}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
        {otherPicked && (
          <div className="field">
            <label htmlFor={`${id}-other`}>
              {label}: {c.other}
            </label>
            <input
              id={`${id}-other`}
              name={otherName(name)}
              type="text"
              placeholder={c.otherPlaceholder}
              defaultValue={asText(raw[otherName(name)])}
              required
            />
          </div>
        )}
      </>
    );
  }

  const common = { id, name, defaultValue: asText(raw[name]), required: q.required };
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {hint}
      </label>
      {q.type === 'long' ? (
        <textarea {...common} />
      ) : (
        <input
          {...common}
          type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text'}
          autoComplete={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : undefined}
          {...(q.type === 'number' ? { min: 0, max: 999999, inputMode: 'numeric' as const } : {})}
        />
      )}
      {help && <span className="hint">{help}</span>}
    </div>
  );
}

export default function FormRenderer({ slug, config, lang }: { slug: string; config: FormConfig; lang: Lang }) {
  const [state, action, pending] = useActionState(submitForm, initial);
  const raw = state.values ?? {};
  const [snap, setSnap] = useState<RawValues>(raw);
  const [keys, setKeys] = useState(() => startingKeys(config.sections, raw));
  const [nextKey, setNextKey] = useState(1000);
  const c = dict(lang).common;

  // After the server sends the form back with a problem, the inputs are reset to what was sent.
  useEffect(() => setSnap(state.values ?? {}), [state]);

  // Under contact rules, phone and email are not marked optional; a note follows the later one.
  const contact = config.contactRule ? contactQuestions(config).map((q) => q.id) : [];
  const order = config.sections.flatMap((s) => s.questions.map((q) => q.id));
  const contactNoteAfter = [...contact].sort((a, b) => order.indexOf(a) - order.indexOf(b)).at(-1);

  if (state.status === 'ok') {
    return (
      <div className="panel">
        <h2 className="h-sm">{tx(config.thanksTitle, lang)}</h2>
        <RichText text={tx(config.thanksBody, lang)} />
        <Link className="btn ghost" href={lang === 'es' ? '/?lang=es' : '/'}>
          {c.backHome}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="form" onChange={(e) => setSnap(readForm(e.currentTarget))}>
      <input type="hidden" name="form" value={slug} />
      <input type="hidden" name="lang" value={lang} />
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {config.sections.map((s) => {
        if (!conditionMet(s.showIf, snap)) return null;
        const title = tx(s.title, lang);
        const description = tx(s.description, lang);
        const heading = (
          <>
            {title && <h2 className="h-sm">{title}</h2>}
            {description && <RichText text={description} className="fine" />}
          </>
        );

        if (s.repeat) {
          const repeat = s.repeat;
          const list = keys[s.id] ?? ['0'];
          return (
            <div key={s.id} className="form">
              {list.map((key, i) => (
                <div key={key} className="form child">
                  <input type="hidden" name={repeatKeysName(s.id)} value={key} />
                  <div className="child-head">
                    <h2 className="h-sm">
                      {title || tx(repeat.itemLabel, lang)} {i + 1}
                    </h2>
                    {list.length > 1 && (
                      <button
                        className="btn ghost small"
                        type="button"
                        onClick={() => setKeys({ ...keys, [s.id]: list.filter((k) => k !== key) })}
                      >
                        {c.remove}
                      </button>
                    )}
                  </div>
                  {i === 0 && description && <RichText text={description} className="fine" />}
                  {s.questions.map((q) => (
                    <QuestionField
                      key={q.id}
                      q={q}
                      name={repeatFieldName(s.id, key, q.id)}
                      lang={lang}
                      raw={raw}
                      snap={snap}
                      showOptional
                    />
                  ))}
                </div>
              ))}
              {list.length < repeat.max && (
                <div>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setKeys({ ...keys, [s.id]: [...list, String(nextKey)] });
                      setNextKey(nextKey + 1);
                    }}
                  >
                    + {tx(repeat.addLabel, lang) || 'Add another'}
                  </button>
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={s.id} className="form">
            {heading}
            {s.questions.map((q) =>
              conditionMet(q.showIf, snap) ? (
                <div key={q.id} className="form">
                  <QuestionField
                    q={q}
                    name={fieldName(q.id)}
                    lang={lang}
                    raw={raw}
                    snap={snap}
                    showOptional={!contact.includes(q.id)}
                  />
                  {q.id === contactNoteAfter && <p className="fine">{c.oneWay}</p>}
                </div>
              ) : null,
            )}
          </div>
        );
      })}

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? c.sending : tx(config.submitLabel, lang) || 'Send'}
        </button>
      </div>
      <p className="fine">{c.privacy}</p>
    </form>
  );
}
