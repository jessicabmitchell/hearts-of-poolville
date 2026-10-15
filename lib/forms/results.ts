// Turning saved answers into rows and columns for the admin pages and spreadsheet downloads.

import { answerText, otherName } from './logic';
import type { Answer, Answers, FormConfig, Question, ResponseRow, Section } from './types';

export type Column = {
  label: string;
  /** Section title, added to the label when two columns would otherwise read the same. */
  section?: string;
  value: (answers: Answers, item?: Record<string, Answer>) => string;
};

const single = (q: Question, s: Section): Column => ({
  label: q.label.en,
  section: s.title.en,
  value: (a) => answerText(q, a[q.id], a[otherName(q.id)]),
});

/**
 * Give look-alike labels their section's name, so "Family size" becomes "Family size (My family)".
 * "Your name" and "Name" count as look-alikes.
 */
function distinct<C extends Column>(cols: C[]): C[] {
  const key = (label: string) => label.toLowerCase().replace(/^your\s+/, '').trim();
  const seen = new Map<string, number>();
  for (const col of cols) seen.set(key(col.label), (seen.get(key(col.label)) ?? 0) + 1);
  return cols.map((col) =>
    (seen.get(key(col.label)) ?? 0) > 1 && col.section ? { ...col, label: `${col.label} (${col.section})` } : col,
  );
}

const items = (a: Answers, s: Section) => (Array.isArray(a[s.id]) ? (a[s.id] as Record<string, Answer>[]) : []);

/** Columns for the results list: every question marked "Show in results list". */
export function listColumns(c: FormConfig): Column[] {
  const cols = c.sections.flatMap((s) =>
    s.questions
      .filter((q) => q.inList)
      .map((q): Column =>
        s.repeat
          ? {
              label: q.label.en,
              section: s.title.en,
              value: (a) =>
                items(a, s)
                  .map((it) => answerText(q, it[q.id], it[otherName(q.id)]))
                  .filter(Boolean)
                  .join(', '),
            }
          : single(q, s),
      ),
  );
  return distinct(cols);
}

/** The first repeating section, which gets one spreadsheet row per copy (one per child, and so on). */
export const firstRepeat = (c: FormConfig) => c.sections.find((s) => s.repeat) ?? null;

/** Header and rows for a spreadsheet download of every answer. */
export function sheet(c: FormConfig, rows: ResponseRow[]): string[][] {
  const repeat = firstRepeat(c);
  const top = c.sections.filter((s) => !s.repeat).flatMap((s) => s.questions.map((q) => single(q, s)));
  // Any other repeating sections are squeezed into one cell per question.
  const extra = c.sections
    .filter((s) => s.repeat && s !== repeat)
    .flatMap((s) =>
      s.questions.map(
        (q): Column => ({
          label: `${s.title.en || s.repeat!.itemLabel.en}: ${q.label.en}`,
          value: (a) =>
            items(a, s)
              .map((it, i) => `${i + 1}. ${answerText(q, it[q.id], it[otherName(q.id)])}`)
              .join('; '),
        }),
      ),
    );
  const inner: Column[] = repeat
    ? repeat.questions.map((q) => ({
        label: q.label.en,
        section: repeat.title.en,
        value: (_a: Answers, it?: Record<string, Answer>) => (it ? answerText(q, it[q.id], it[otherName(q.id)]) : ''),
      }))
    : [];
  const named = distinct([...top, ...extra, ...inner]);
  const nameOf = (col: Column) => named[[...top, ...extra, ...inner].indexOf(col)].label;

  const header = [
    'Received',
    'Status',
    'Language',
    ...top.map(nameOf),
    ...extra.map(nameOf),
    ...(repeat ? [`${repeat.repeat!.itemLabel.en} #`, ...inner.map(nameOf)] : []),
  ];

  const out: string[][] = [header];
  for (const r of rows) {
    const a = r.answers ?? {};
    const shared = [
      r.created_at,
      r.status,
      r.language === 'es' ? 'Spanish' : 'English',
      ...top.map((col) => col.value(a)),
      ...extra.map((col) => col.value(a)),
    ];
    const list = repeat ? items(a, repeat) : [];
    if (!repeat) out.push(shared);
    else if (list.length === 0) out.push([...shared, '', ...inner.map(() => '')]);
    else list.forEach((it, i) => out.push([...shared, String(i + 1), ...inner.map((col) => col.value(a, it))]));
  }
  return out;
}

/** All of a response's text, lowercased, for the search box. */
export function searchText(r: ResponseRow): string {
  const parts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(r.answers);
  return parts.join(' ').toLowerCase();
}
