import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_FORMS, DEFAULT_ORDER } from './defaults';
import { normalizeConfig } from './logic';
import type { FormConfig, ResponseRow, StoredForm } from './types';

type FormRow = { slug: string; config: unknown; updated_at: string | null; updated_by: string | null };

const toStored = (row: FormRow): StoredForm => ({
  slug: row.slug,
  config: normalizeConfig(row.config, row.slug),
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
});

const fromDefault = (slug: string): StoredForm => ({
  slug,
  config: normalizeConfig(DEFAULT_FORMS[slug], slug),
  updatedAt: null,
  updatedBy: null,
});

function sortForms(forms: StoredForm[]): StoredForm[] {
  const rank = (slug: string) => {
    const i = DEFAULT_ORDER.indexOf(slug);
    return i === -1 ? DEFAULT_ORDER.length : i;
  };
  return forms.sort((a, b) => rank(a.slug) - rank(b.slug) || a.config.name.localeCompare(b.config.name));
}

/**
 * Every form, saving any starting form that is not in the database yet. If the database cannot be
 * reached, the starting forms are used so the public pages still show something.
 */
export async function getAllForms(): Promise<StoredForm[]> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('forms').select('slug, config, updated_at, updated_by');
    if (error) throw error;
    const rows = (data ?? []) as FormRow[];
    const have = new Set(rows.map((r) => r.slug));
    const missing = DEFAULT_ORDER.filter((slug) => !have.has(slug));
    if (missing.length) {
      const { error: seedError } = await db
        .from('forms')
        .upsert(
          missing.map((slug) => ({ slug, config: DEFAULT_FORMS[slug] })),
          { onConflict: 'slug', ignoreDuplicates: true },
        );
      if (seedError) console.error('could not save starting forms', seedError);
    }
    return sortForms([...rows.map(toStored), ...missing.map(fromDefault)]);
  } catch (e) {
    console.error('getAllForms failed, using starting forms', e);
    return sortForms(DEFAULT_ORDER.map(fromDefault));
  }
}

export async function getForm(slug: string): Promise<StoredForm | null> {
  try {
    const { data, error } = await createAdminClient()
      .from('forms')
      .select('slug, config, updated_at, updated_by')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data) return toStored(data as FormRow);
  } catch (e) {
    console.error('getForm failed', slug, e);
  }
  if (!DEFAULT_FORMS[slug]) return null;
  // Not saved yet: save the starting version so edits have something to build on.
  try {
    await createAdminClient()
      .from('forms')
      .upsert({ slug, config: DEFAULT_FORMS[slug] }, { onConflict: 'slug', ignoreDuplicates: true });
  } catch (e) {
    console.error('could not save starting form', slug, e);
  }
  return fromDefault(slug);
}

/** Save a form, keeping the version it replaces so it can be brought back. */
export async function saveForm(slug: string, config: FormConfig, by: string): Promise<void> {
  const db = createAdminClient();
  const { data: current } = await db.from('forms').select('config').eq('slug', slug).maybeSingle();
  if (current) {
    const { error } = await db.from('form_versions').insert({ slug, config: current.config, saved_by: by });
    if (error) throw error;
  }
  const { error } = await db
    .from('forms')
    .upsert({ slug, config, updated_at: new Date().toISOString(), updated_by: by }, { onConflict: 'slug' });
  if (error) throw error;
}

export type Version = { id: number; savedAt: string; savedBy: string | null; config: FormConfig };

/** Earlier versions of a form, newest first. */
export async function getVersions(slug: string, limit = 15): Promise<Version[]> {
  const { data, error } = await createAdminClient()
    .from('form_versions')
    .select('id, config, saved_at, saved_by')
    .eq('slug', slug)
    .order('id', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getVersions failed', error);
    return [];
  }
  return (data ?? []).map((v) => ({
    id: v.id as number,
    savedAt: v.saved_at as string,
    savedBy: (v.saved_by as string | null) ?? null,
    config: normalizeConfig(v.config, slug),
  }));
}

// ---------- Responses ----------

export async function addResponse(row: Omit<ResponseRow, 'id' | 'created_at'>): Promise<void> {
  const { error } = await createAdminClient().from('responses').insert(row);
  if (error) throw error;
}

export async function getResponses(slug: string): Promise<ResponseRow[]> {
  const { data, error } = await createAdminClient()
    .from('responses')
    .select('*')
    .eq('form_slug', slug)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as ResponseRow[];
}

export async function getResponse(id: string): Promise<ResponseRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await createAdminClient().from('responses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as ResponseRow | null) ?? null;
}

/** How many responses each form has, in total and still at its first status. */
export async function getCounts(forms: StoredForm[]): Promise<Record<string, { total: number; fresh: number }>> {
  const counts: Record<string, { total: number; fresh: number }> = {};
  for (const f of forms) counts[f.slug] = { total: 0, fresh: 0 };
  const { data, error } = await createAdminClient().from('response_counts').select('form_slug, status, total');
  if (error) {
    console.error('getCounts failed', error);
    return counts;
  }
  const firstStatus = new Map(forms.map((f) => [f.slug, f.config.statuses[0]]));
  for (const row of data ?? []) {
    const slug = row.form_slug as string;
    counts[slug] ??= { total: 0, fresh: 0 };
    const n = Number(row.total) || 0;
    counts[slug].total += n;
    if (row.status === firstStatus.get(slug)) counts[slug].fresh += n;
  }
  return counts;
}
