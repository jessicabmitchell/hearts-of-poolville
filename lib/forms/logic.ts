// Rules shared by the public forms, the server that checks answers, and the admin pages.

import type { Answer, Answers, Condition, FormConfig, Option, Question, QuestionType, Section, T } from './types';

export type Lang = 'en' | 'es';

export const QUESTION_TYPES: QuestionType[] = ['short', 'long', 'email', 'phone', 'number', 'choice', 'checkboxes'];
export const OTHER = '__other';

/** Pick the text for a language. Empty Spanish falls back to English. */
export function tx(t: T | undefined, lang: Lang): string {
  if (!t) return '';
  return lang === 'es' && t.es.trim() ? t.es : t.en;
}

export const emptyT = (): T => ({ en: '', es: '' });

export function newId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Open and closed ----------

export type OpenState = 'open' | 'not_yet' | 'closed' | 'full';

/** Today's date in Poolville as 'YYYY-MM-DD'. */
export function todayInPoolville(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(now);
}

/**
 * Whether a form takes responses today. Opening and closing days both count as open. `filled` is
 * how many have signed up so far, for forms with a limit.
 */
export function openState(
  c: Pick<FormConfig, 'enabled' | 'opens' | 'closes' | 'archived' | 'capacity'>,
  now = new Date(),
  filled = 0,
): OpenState {
  // `OPEN_ALL_FORMS=1 npm run dev` opens every form on your own computer, to preview them early.
  if (process.env.NODE_ENV === 'development' && process.env.OPEN_ALL_FORMS === '1') return 'open';
  if (!c.enabled || c.archived) return 'closed';
  const day = todayInPoolville(now);
  if (c.opens && day < c.opens) return 'not_yet';
  if (c.closes && day > c.closes) return 'closed';
  if (c.capacity && filled >= c.capacity) return 'full';
  return 'open';
}

/** Turn '2026-11-15' into "November 15" or "15 de noviembre". */
export function formatDay(isoDate: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

// ---------- Field names on the public form ----------

export const fieldName = (questionId: string) => `q_${questionId}`;
export const repeatKeysName = (sectionId: string) => `r_${sectionId}_keys`;
export const repeatFieldName = (sectionId: string, key: string, questionId: string) =>
  `r_${sectionId}_${key}_${questionId}`;
export const otherName = (name: string) => `${name}__other`;

export const hasOptions = (type: QuestionType) => type === 'choice' || type === 'checkboxes';

// ---------- Showing and hiding ----------

/** Raw values from the form, by field name. */
export type RawValues = Record<string, string | string[]>;

export function conditionMet(cond: Condition | null, raw: RawValues): boolean {
  if (!cond) return true;
  const v = raw[fieldName(cond.question)];
  return Array.isArray(v) ? v.includes(cond.equals) : v === cond.equals;
}

/** Every question outside repeating sections, in order. These are the ones conditions can point at. */
export function conditionTargets(c: FormConfig): Question[] {
  return c.sections.filter((s) => !s.repeat).flatMap((s) => s.questions.filter((q) => hasOptions(q.type)));
}

// ---------- Reading and checking answers ----------

export type Messages = {
  answer: string;
  contact: string;
  email: string;
  number: string;
  other: string;
};

const MAX_LEN: Record<QuestionType, number> = {
  short: 200,
  long: 2000,
  email: 120,
  phone: 40,
  number: 6,
  choice: 60,
  checkboxes: 60,
};

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function readQuestion(q: Question, name: string, get: (name: string) => string[]): { answer: Answer; other: string } {
  const valid = new Set([...q.options.map((o) => o.id), ...(q.other ? [OTHER] : [])]);
  if (q.type === 'checkboxes') {
    const picked = Array.from(new Set(get(name))).filter((v) => valid.has(v));
    return { answer: picked, other: picked.includes(OTHER) ? clean(get(otherName(name))[0], 300) : '' };
  }
  const v = clean(get(name)[0], MAX_LEN[q.type]);
  if (q.type === 'choice') {
    const ok = valid.has(v) ? v : '';
    return { answer: ok, other: ok === OTHER ? clean(get(otherName(name))[0], 300) : '' };
  }
  return { answer: v, other: '' };
}

function checkQuestion(q: Question, a: Answer, other: string, lang: Lang, m: Messages): string {
  const label = tx(q.label, lang);
  const empty = Array.isArray(a) ? a.length === 0 : !a;
  if (empty) return q.required ? `${m.answer} ${label}` : '';
  const pickedOther = Array.isArray(a) ? a.includes(OTHER) : a === OTHER;
  if (pickedOther && !other) return `${label}: ${m.other}`;
  if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a as string)) return `${label}: ${m.email}`;
  if (q.type === 'number' && !/^\d{1,6}$/.test(a as string)) return `${label}: ${m.number}`;
  return '';
}

/**
 * Read a submitted form against its questions. Hidden questions are skipped, so their answers are
 * never saved. Returns the answers, or the first problem found.
 */
export function readAnswers(
  c: FormConfig,
  get: (name: string) => string[],
  lang: Lang,
  m: Messages,
): { answers: Answers; error: string } {
  const answers: Answers = {};
  // Raw values of questions read so far, so later conditions can look at them.
  const seen: RawValues = {};
  let error = '';
  const fail = (msg: string) => {
    if (!error && msg) error = msg;
  };

  for (const s of c.sections) {
    if (!conditionMet(s.showIf, seen)) continue;

    if (s.repeat) {
      const keys = Array.from(new Set(get(repeatKeysName(s.id))))
        .filter((k) => /^\d{1,4}$/.test(k))
        .slice(0, s.repeat.max);
      const items = keys.map((key, i) => {
        const item: Record<string, Answer> = {};
        for (const q of s.questions) {
          const { answer, other } = readQuestion(q, repeatFieldName(s.id, key, q.id), get);
          const problem = checkQuestion(q, answer, other, lang, m);
          if (problem) fail(`${tx(s.repeat!.itemLabel, lang)} ${i + 1}: ${problem}`);
          item[q.id] = answer;
          if (other) item[otherName(q.id)] = other;
        }
        return item;
      });
      answers[s.id] = items;
      continue;
    }

    for (const q of s.questions) {
      if (!conditionMet(q.showIf, seen)) continue;
      const { answer, other } = readQuestion(q, fieldName(q.id), get);
      fail(checkQuestion(q, answer, other, lang, m));
      answers[q.id] = answer;
      seen[fieldName(q.id)] = answer;
      if (other) answers[otherName(q.id)] = other;
    }
  }

  if (!error && c.contactRule) {
    const contact = contactQuestions(c);
    if (contact.length && !contact.some((q) => answers[q.id])) fail(m.contact);
  }
  return { answers, error };
}

/** The first phone and first email questions outside repeating sections. */
export function contactQuestions(c: FormConfig): Question[] {
  const flat = c.sections.filter((s) => !s.repeat).flatMap((s) => s.questions);
  return [flat.find((q) => q.type === 'phone'), flat.find((q) => q.type === 'email')].filter(
    (q): q is Question => Boolean(q),
  );
}

// ---------- Showing answers to volunteers ----------

/** Turn a saved answer into readable English text. */
export function answerText(q: Question, value: unknown, other: unknown): string {
  const label = (id: string) =>
    id === OTHER ? `Other: ${typeof other === 'string' ? other : ''}` : (q.options.find((o) => o.id === id)?.label.en ?? id);
  if (Array.isArray(value)) return value.map((v) => label(String(v))).join(', ');
  if (typeof value !== 'string') return '';
  return hasOptions(q.type) ? (value ? label(value) : '') : value;
}

// ---------- Keeping saved forms in a safe shape ----------

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
const toT = (v: unknown, max = 2000): T => {
  const o = (v ?? {}) as Partial<T>;
  return { en: str(o.en, max), es: str(o.es, max) };
};
const toId = (v: unknown, fallback: string) => {
  const s = str(v, 40).replace(/[^a-zA-Z0-9_]/g, '');
  return s && !s.startsWith('__') ? s : fallback;
};
const toDate = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/**
 * Fill in anything missing and drop anything broken, so a form saved by an older version of the
 * site, or edited by hand, still works.
 */
export function normalizeConfig(input: unknown, fallbackName = 'Form'): FormConfig {
  const o = (input ?? {}) as Record<string, unknown>;
  const usedIds = new Set<string>();
  const unique = (id: string, prefix: string) => {
    let out = id;
    while (usedIds.has(out)) out = newId(prefix);
    usedIds.add(out);
    return out;
  };

  const toCondition = (v: unknown): Condition | null => {
    const c = v as Partial<Condition> | null;
    return c && typeof c.question === 'string' && typeof c.equals === 'string'
      ? { question: c.question, equals: c.equals }
      : null;
  };

  const sections: Section[] = (Array.isArray(o.sections) ? o.sections : []).slice(0, 40).map((sv) => {
    const s = (sv ?? {}) as Record<string, unknown>;
    const r = s.repeat as Record<string, unknown> | null | undefined;
    return {
      id: unique(toId(s.id, newId('s_')), 's_'),
      title: toT(s.title, 200),
      description: toT(s.description, 1000),
      showIf: toCondition(s.showIf),
      repeat: r
        ? {
            max: Math.min(Math.max(Number(r.max) || 10, 1), 50),
            itemLabel: toT(r.itemLabel, 60),
            addLabel: toT(r.addLabel, 60),
          }
        : null,
      questions: (Array.isArray(s.questions) ? s.questions : []).slice(0, 80).map((qv) => {
        const q = (qv ?? {}) as Record<string, unknown>;
        const type = QUESTION_TYPES.includes(q.type as QuestionType) ? (q.type as QuestionType) : 'short';
        const optionIds = new Set<string>();
        const options: Option[] = hasOptions(type)
          ? (Array.isArray(q.options) ? q.options : []).slice(0, 50).map((ov) => {
              const op = (ov ?? {}) as Record<string, unknown>;
              let id = toId(op.id, newId('o_'));
              while (optionIds.has(id)) id = newId('o_');
              optionIds.add(id);
              return { id, label: toT(op.label, 200) };
            })
          : [];
        return {
          id: unique(toId(q.id, newId('q_')), 'q_'),
          type,
          label: toT(q.label, 300),
          help: toT(q.help, 500),
          required: Boolean(q.required),
          options,
          other: hasOptions(type) && Boolean(q.other),
          showIf: toCondition(q.showIf),
          inList: Boolean(q.inList),
        };
      }),
    };
  });

  // Drop conditions that point at a question or option that no longer exists.
  const targets = new Map(
    sections.filter((s) => !s.repeat).flatMap((s) => s.questions.map((q) => [q.id, q] as const)),
  );
  const valid = (c: Condition | null) => {
    const q = c && targets.get(c.question);
    return q && hasOptions(q.type) && (q.options.some((op) => op.id === c!.equals) || (q.other && c!.equals === OTHER))
      ? c
      : null;
  };
  for (const s of sections) {
    s.showIf = valid(s.showIf);
    for (const q of s.questions) q.showIf = s.repeat ? null : valid(q.showIf);
  }

  const statuses = Array.from(
    new Set((Array.isArray(o.statuses) ? o.statuses : []).map((v) => str(v, 40).trim()).filter(Boolean)),
  ).slice(0, 10);

  return {
    name: str(o.name, 60).trim() || fallbackName,
    eyebrow: toT(o.eyebrow, 80),
    title: toT(o.title, 200),
    intro: toT(o.intro, 4000),
    enabled: o.enabled !== false,
    opens: toDate(o.opens),
    closes: toDate(o.closes),
    closedMessage: toT(o.closedMessage, 500),
    capacity: Number.isInteger(Number(o.capacity)) && Number(o.capacity) > 0 ? Math.min(Number(o.capacity), 100000) : null,
    capacityUnit: str(o.capacityUnit, 40).trim() || (sections.some((s) => s.repeat) ? 'children' : 'responses'),
    fullMessage: toT(o.fullMessage, 500),
    submitLabel: toT(o.submitLabel, 60),
    thanksTitle: toT(o.thanksTitle, 200),
    thanksBody: toT(o.thanksBody, 1000),
    contactRule: Boolean(o.contactRule),
    onRequestPage: Boolean(o.onRequestPage),
    archived: Boolean(o.archived),
    statuses: statuses.length ? statuses : ['New', 'Done'],
    sections,
  };
}
