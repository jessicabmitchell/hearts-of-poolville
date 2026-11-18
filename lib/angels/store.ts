import 'server-only';
import { answerText, otherName } from '@/lib/forms/logic';
import { firstRepeat } from '@/lib/forms/results';
import { getForm, getResponses } from '@/lib/forms/store';
import type { Answer, FormConfig, ResponseRow } from '@/lib/forms/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { ANGEL_FORM, ANGEL_PREFIX, TAG_FORM, TAG_QUESTION, angelCode, parseAngelNumbers } from './logic';

type AngelRow = {
  response_id: string;
  idx: number;
  number: number;
  code: string;
  tag_response_id: string | null;
  tagged_at: string | null;
  tagged_by: string | null;
};

export type TagForm = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  text: string;
  /** IDs of the angels matched to this tag form. */
  codes: string[];
};

export type Angel = {
  number: number;
  code: string;
  responseId: string;
  child: string;
  age: string;
  gender: string;
  family: string;
  tag: TagForm | null;
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Give every child on the Angel Tree form an ID if they do not have one yet. */
async function assignCodes(config: FormConfig): Promise<void> {
  const { error } = await createAdminClient().rpc('assign_angel_codes', {
    p_slug: ANGEL_FORM,
    p_section: firstRepeat(config)?.id ?? 'children',
    p_prefix: ANGEL_PREFIX,
  });
  if (error) throw error;
}

async function angelRows(responseIds?: string[]): Promise<AngelRow[]> {
  let query = createAdminClient()
    .from('angels')
    .select('response_id, idx, number, code, tag_response_id, tagged_at, tagged_by')
    .order('number')
    .limit(10000);
  if (responseIds) query = query.in('response_id', responseIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AngelRow[];
}

/**
 * The angel IDs for some Angel Tree sign-ups, as response id → child's place on the form → ID.
 * Used for the response page and the spreadsheet download.
 */
export async function getAngelCodes(config: FormConfig, responseIds?: string[]): Promise<Record<string, Record<number, string>>> {
  await assignCodes(config);
  const out: Record<string, Record<number, string>> = {};
  for (const a of await angelRows(responseIds)) (out[a.response_id] ??= {})[a.idx] = a.code;
  return out;
}

const tagForm = (r: ResponseRow, codes: string[]): TagForm => {
  const a = r.answers ?? {};
  return {
    id: r.id,
    createdAt: r.created_at,
    name: str(a.name),
    phone: str(a.phone),
    email: str(a.email),
    text: str(a[TAG_QUESTION]),
    codes,
  };
};

/** Every angel with their tag, and every tag form with the angels matched to it. */
export async function getAngelBoard(): Promise<{ angels: Angel[]; tagForms: TagForm[] }> {
  const form = await getForm(ANGEL_FORM);
  if (!form) return { angels: [], tagForms: [] };
  await assignCodes(form.config);
  const [rows, signUps, tags] = await Promise.all([angelRows(), getResponses(ANGEL_FORM), getResponses(TAG_FORM)]);

  const codesByTag = new Map<string, string[]>();
  for (const a of rows) if (a.tag_response_id) codesByTag.set(a.tag_response_id, [...(codesByTag.get(a.tag_response_id) ?? []), a.code]);
  const tagForms = tags.map((r) => tagForm(r, codesByTag.get(r.id) ?? []));
  const tagById = new Map(tagForms.map((t) => [t.id, t]));

  const repeat = firstRepeat(form.config);
  const question = (id: string) => repeat?.questions.find((q) => q.id === id);
  const show = (child: Record<string, Answer>, id: string) => {
    const q = question(id);
    return q ? answerText(q, child[id], child[otherName(id)]) : str(child[id]);
  };
  const byId = new Map(signUps.map((r) => [r.id, r]));

  const angels = rows.flatMap((a): Angel[] => {
    const r = byId.get(a.response_id);
    if (!r) return [];
    const answers = r.answers ?? {};
    const list = repeat && Array.isArray(answers[repeat.id]) ? (answers[repeat.id] as Record<string, Answer>[]) : [];
    const child = list[a.idx] ?? {};
    return [
      {
        number: a.number,
        code: a.code,
        responseId: a.response_id,
        child: show(child, 'child_name'),
        age: show(child, 'age'),
        gender: show(child, 'gender'),
        family: str(answers.parent_name) || str(answers.name),
        tag: a.tag_response_id ? (tagById.get(a.tag_response_id) ?? null) : null,
      },
    ];
  });
  return { angels, tagForms };
}

export type LinkResult = { matched: string[]; taken: string[]; unknown: string[] };

/**
 * Match a tag form to the angels whose numbers are in `text`. An angel already matched to a
 * different tag form is left alone and reported as taken.
 */
export async function linkTags(tagResponseId: string, text: string, by: string): Promise<LinkResult> {
  const numbers = parseAngelNumbers(text);
  if (numbers.length === 0) return { matched: [], taken: [], unknown: [] };
  const form = await getForm(ANGEL_FORM);
  if (form) await assignCodes(form.config);
  const db = createAdminClient();
  const { data, error } = await db
    .from('angels')
    .update({ tag_response_id: tagResponseId, tagged_at: new Date().toISOString(), tagged_by: by })
    .in('number', numbers)
    .or(`tag_response_id.is.null,tag_response_id.eq.${tagResponseId}`)
    .select('number');
  if (error) throw error;
  const matched = new Set((data ?? []).map((d) => d.number as number));
  const { data: existing, error: existsError } = await db.from('angels').select('number').in('number', numbers);
  if (existsError) throw existsError;
  const exists = new Set((existing ?? []).map((d) => d.number as number));
  return {
    matched: numbers.filter((n) => matched.has(n)).map(angelCode),
    taken: numbers.filter((n) => exists.has(n) && !matched.has(n)).map(angelCode),
    unknown: numbers.filter((n) => !exists.has(n)).map(angelCode),
  };
}

/** Take an angel's tag match off, so their tag counts as not taken. */
export async function unlinkAngel(number: number): Promise<void> {
  const { error } = await createAdminClient()
    .from('angels')
    .update({ tag_response_id: null, tagged_at: null, tagged_by: null })
    .eq('number', number);
  if (error) throw error;
}
