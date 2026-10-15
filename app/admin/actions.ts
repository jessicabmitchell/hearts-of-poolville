'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { DEFAULT_FORMS } from '@/lib/forms/defaults';
import { emptyT, normalizeConfig } from '@/lib/forms/logic';
import { getAllForms, getForm, saveForm } from '@/lib/forms/store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { FormState } from '@/lib/types';

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: 'error', message: 'That email and password did not match.' };
  }
  redirect('/admin');
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ---------- Responses ----------

export async function updateStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '')
    .trim()
    .slice(0, 40);
  if (!id || !status) return;
  const { error } = await createAdminClient().from('responses').update({ status }).eq('id', id);
  if (error) console.error('updateStatus failed', error);
  revalidatePath('/admin', 'layout');
}

export async function deleteResponse(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const slug = String(formData.get('slug') ?? '');
  if (id) {
    const { error } = await createAdminClient().from('responses').delete().eq('id', id);
    if (error) console.error('deleteResponse failed', error);
  }
  revalidatePath('/admin', 'layout');
  redirect(`/admin/results/${encodeURIComponent(slug)}`);
}

// ---------- Forms ----------

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string };

export async function saveFormConfig(slug: string, config: unknown): Promise<SaveResult> {
  const user = await requireAdmin();
  const existing = await getForm(slug);
  if (!existing || existing.config.archived) return { ok: false, message: 'That form could not be found.' };

  const clean = normalizeConfig(config, existing.config.name);
  if (!clean.title.en.trim()) return { ok: false, message: 'Give the form a title in English.' };
  for (const s of clean.sections) {
    for (const q of s.questions) {
      if (!q.label.en.trim()) return { ok: false, message: 'Every question needs a label in English.' };
      if ((q.type === 'choice' || q.type === 'checkboxes') && q.options.length === 0 && !q.other) {
        return { ok: false, message: `"${q.label.en}" needs at least one choice.` };
      }
    }
  }

  try {
    await saveForm(slug, clean, user.email ?? 'unknown');
  } catch (e) {
    console.error('saveFormConfig failed', e);
    return { ok: false, message: 'Saving did not work. Please try again in a minute.' };
  }
  // Public pages, the home page tags, and the admin menu all read forms.
  revalidatePath('/', 'layout');
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function createForm(formData: FormData) {
  const user = await requireAdmin();
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 60);
  if (!name) redirect('/admin/forms/new?missing=1');

  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'form';
  const taken = new Set([...(await getAllForms()).map((f) => f.slug), ...Object.keys(DEFAULT_FORMS)]);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}_${n}`;

  const t = (en: string, es: string) => ({ en, es });
  const config = normalizeConfig(
    {
      name,
      title: t(name, ''),
      eyebrow: emptyT(),
      intro: emptyT(),
      // New forms start turned off, so nobody sees them half-built.
      enabled: false,
      contactRule: true,
      statuses: ['New', 'In progress', 'Done'],
      submitLabel: t('Send', 'Enviar'),
      thanksTitle: t('Thank you. We got your response.', 'Gracias. Recibimos su respuesta.'),
      closedMessage: t(
        'This form is not taking responses right now.',
        'Este formulario no está recibiendo respuestas en este momento.',
      ),
      sections: [
        {
          id: 'main',
          title: emptyT(),
          questions: [
            { id: 'name', type: 'short', label: t('Your name', 'Su nombre'), required: true, inList: true },
            { id: 'phone', type: 'phone', label: t('Phone', 'Teléfono') },
            { id: 'email', type: 'email', label: t('Email', 'Correo electrónico') },
          ],
        },
      ],
    },
    name,
  );

  try {
    await saveForm(slug, config, user.email ?? 'unknown');
  } catch (e) {
    console.error('createForm failed', e);
    redirect('/admin/forms/new?failed=1');
  }
  revalidatePath('/admin', 'layout');
  redirect(`/admin/forms/${slug}`);
}
