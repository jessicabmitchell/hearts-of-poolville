'use server';

import { dict, toLang } from '@/lib/i18n';
import { openState, readAnswers, type RawValues } from '@/lib/forms/logic';
import { addResponse, getForm } from '@/lib/forms/store';
import type { FormState } from '@/lib/types';

/** Everything that was sent, so the form can be filled back in if there is a problem. */
function rawValues(formData: FormData): RawValues {
  const out: RawValues = {};
  for (const [k, v] of formData) {
    if (typeof v !== 'string' || k === 'website' || k.startsWith('$')) continue;
    const had = out[k];
    const value = v.slice(0, 2000);
    out[k] = had === undefined ? value : Array.isArray(had) ? [...had, value] : [had, value];
  }
  return out;
}

export async function submitForm(_prev: FormState, formData: FormData): Promise<FormState> {
  // Hidden "website" field: real people leave it empty, form-filling bots do not.
  const website = formData.get('website');
  if (typeof website === 'string' && website.trim()) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const err = dict(lang).errors;
  const slug = String(formData.get('form') ?? '').slice(0, 60);
  const values = rawValues(formData);

  const form = await getForm(slug);
  if (!form || openState(form.config) !== 'open') return { status: 'error', message: err.closed, values };

  const { answers, error } = readAnswers(
    form.config,
    (name) => formData.getAll(name).filter((v): v is string => typeof v === 'string'),
    lang,
    { answer: err.answer, contact: err.contact, email: err.email, number: err.number, other: err.other },
  );
  if (error) return { status: 'error', message: error, values };

  try {
    await addResponse({ form_slug: slug, language: lang, status: form.config.statuses[0], answers });
  } catch (e) {
    console.error('submitForm failed', slug, e);
    return { status: 'error', message: err.saveFailed, values };
  }
  return { status: 'ok' };
}
