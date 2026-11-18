// Angel IDs (A1, A2, ...) and reading them back out of what people type on the tag form.

/** The Angel Tree sign-up form, and the tag form with the question that asks which tag they took. */
export const ANGEL_FORM = 'angel_tree';
export const TAG_FORM = 'tags';
export const TAG_QUESTION = 'tags';
export const ANGEL_PREFIX = 'A';

export const angelCode = (n: number) => `${ANGEL_PREFIX}${n}`;

// Words people might write around the numbers, in English and Spanish.
const FILLER = /(?<!\p{L})(and|y|[aá]ngel(?:es|s)?|tags?|etiquetas?|numbers?|n[uú]meros?|no|nos|id|ids)(?!\p{L})\.?/giu;

/**
 * The angel numbers in what someone typed, like "A12", "a 12, A-15", "#12", or just "12 and 15".
 * Plain numbers only count when the answer is nothing but numbers, so "2 tags: 14 and 15" or
 * "the 7 year old" are left for a volunteer to match by hand instead of matching the wrong child.
 */
export function parseAngelNumbers(text: string): number[] {
  const unique = (ns: number[]) => Array.from(new Set(ns.filter((n) => n > 0)));
  // "A12", "a 12", "A-12", "A#12". Not "a 12 year old", which is about the child's age.
  const coded = [...text.matchAll(/(?<!\p{L})A\s*[-#]?\s*0*(\d{1,4})(?!\d)(?!\s*-?\s*(?:years?|yrs?|y\/?o|años|months?|meses)(?!\p{L}))/giu)]
    .map((m) => Number(m[1]));
  if (coded.length) return unique(coded);
  const leftover = text.replace(FILLER, '').replace(/[\d\s,;&#/+.\-]/g, '');
  if (leftover) return [];
  return unique([...text.matchAll(/\d{1,4}/g)].map((m) => Number(m[0])));
}
