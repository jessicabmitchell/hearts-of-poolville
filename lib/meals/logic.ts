// Holiday meal kits: kit sizes, what goes in each, and what each registered family needs.
// Shared by the admin pages and the server actions.

import type { Answers } from '@/lib/forms/types';

export const EVENTS = {
  thanksgiving: { name: 'Thanksgiving', prefix: 'TG' },
  christmas: { name: 'Christmas', prefix: 'CH' },
} as const;
export type MealEvent = keyof typeof EVENTS;
export const isMealEvent = (v: string): v is MealEvent => v in EVENTS;

/** A kit size, chosen by household size. `max` null means no upper limit. */
export type Tier = { id: string; name: string; min: number; max: number | null };
/** One thing that goes in a kit, with how many for each kit size (by tier id). */
export type KitItem = { id: string; name: string; unit: string; qty: Record<string, number> };
export type MealPlan = { tiers: Tier[]; items: KitItem[] };

const TIERS: Tier[] = [
  { id: 'small', name: 'Small', min: 1, max: 4 },
  { id: 'medium', name: 'Medium', min: 5, max: 7 },
  { id: 'large', name: 'Large', min: 8, max: null },
];

// Small is the kit from the planning notes. Medium and Large are starting guesses to check.
const ITEMS: [string, string, string, number, number, number][] = [
  ['potatoes', 'Potatoes', '5-lb bags', 1, 2, 2],
  ['gravy', 'Gravy', 'packets', 2, 3, 4],
  ['green_beans', 'Green beans', 'cans', 2, 3, 4],
  ['cream_mushroom', 'Cream of mushroom', 'cans', 1, 2, 2],
  ['fried_onions', 'Fried onions', 'containers', 1, 2, 2],
  ['corn', 'Corn', 'cans', 2, 3, 4],
  ['carrots', 'Carrots', 'cans', 1, 2, 2],
  ['mac_cheese', 'Mac & cheese', 'boxes', 2, 3, 4],
  ['stuffing', 'Stuffing', 'boxes', 2, 3, 4],
  ['cranberry', 'Cranberry sauce', 'cans', 1, 2, 2],
  ['pumpkin', 'Pumpkin', 'cans', 1, 1, 2],
  ['evap_milk', 'Evaporated milk', 'cans', 1, 1, 2],
  ['pie_crust', 'Pie crust', 'shells', 1, 1, 2],
  ['rolls', 'Dinner rolls', 'packs', 1, 2, 2],
  ['turkey', 'Turkey', 'whole', 1, 1, 1],
];

export function defaultPlan(): MealPlan {
  return {
    tiers: TIERS.map((t) => ({ ...t })),
    items: ITEMS.map(([id, name, unit, small, medium, large]) => ({ id, name, unit, qty: { small, medium, large } })),
  };
}

/** "1 cans" reads oddly, so drop the plural ending for one. */
export function amount(qty: number, unit: string): string {
  if (qty !== 1) return `${qty} ${unit}`;
  const one = /(x|ch|sh|ss)es$/.test(unit) ? unit.slice(0, -2) : /[^s]s$/.test(unit) ? unit.slice(0, -1) : unit;
  return `${qty} ${one}`;
}

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const id = (v: unknown) => text(v, 40).replace(/[^a-zA-Z0-9_]/g, '');

/** Fill in anything missing and drop anything broken in a saved plan. */
export function normalizePlan(input: unknown): MealPlan {
  const o = (input ?? {}) as Partial<MealPlan>;
  const used = new Set<string>();
  const unique = (raw: unknown, prefix: string) => {
    let out = id(raw) || `${prefix}${used.size + 1}`;
    while (used.has(out)) out = `${out}_${used.size + 1}`;
    used.add(out);
    return out;
  };
  const tiers = (Array.isArray(o.tiers) && o.tiers.length ? o.tiers : TIERS).slice(0, 6).map((t, i) => ({
    id: unique(t?.id, 'size'),
    name: text(t?.name, 30) || `Size ${i + 1}`,
    min: int(t?.min, 1, 99, 1),
    max: t?.max === null || t?.max === undefined || (t?.max as unknown) === '' ? null : int(t?.max, 1, 99, 99),
  }));
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 80).map((it) => {
    const qty: Record<string, number> = {};
    for (const t of tiers) qty[t.id] = int(it?.qty?.[t.id], 0, 999, 0);
    return { id: unique(it?.id, 'item'), name: text(it?.name, 60) || 'Unnamed item', unit: text(it?.unit, 30), qty };
  });
  return { tiers, items };
}

/** The kit size for a household, or null if the size is unknown. */
export function tierFor(plan: MealPlan, size: number | null): Tier | null {
  if (!size) return null;
  const sorted = [...plan.tiers].sort((a, b) => a.min - b.min);
  return sorted.find((t) => size >= t.min && (t.max === null || size <= t.max)) ?? sorted.at(-1) ?? null;
}

/** What a kit of this size holds, leaving out items it gets none of. */
export function kitFor(plan: MealPlan, tier: Tier | null): { item: KitItem; qty: number }[] {
  const t = tier ?? plan.tiers[0];
  if (!t) return [];
  return plan.items.map((item) => ({ item, qty: item.qty[t.id] ?? 0 })).filter((x) => x.qty > 0);
}

// ---------- Families ----------

export type Kit = {
  response_id: string;
  number: number;
  code: string;
  checked: string[];
  packed_at: string | null;
  packed_by: string | null;
  items: Record<string, number> | null;
  picked_up_at: string | null;
  picked_up_by: string | null;
  pickup_override: boolean;
  history: { action: string; by: string; at: string }[];
};

export type Family = {
  id: string;
  code: string;
  number: number;
  /** The family the meal is for. */
  name: string;
  size: number | null;
  phone: string;
  /** Who is coming to pick it up. */
  pickupBy: string;
  /** The person who filled out the form, when it was for another family. */
  filledBy: string;
  registeredAt: string;
  kit: Kit;
};

/**
 * Read the dinner form's answers. Uses the question ids the Thanksgiving and Christmas forms
 * started with; if those questions are renamed in the form editor this still finds the answers.
 */
export function familyFrom(id: string, created: string, a: Answers, kit: Kit): Family {
  const s = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');
  const forOther = s('for_who') === 'other';
  const filler = s('name');
  const size = Number.parseInt(forOther ? s('recipient_household') : s('household'), 10);
  return {
    id,
    code: kit.code,
    number: kit.number,
    name: (forOther ? s('recipient_name') : filler) || filler || 'No name given',
    size: Number.isInteger(size) && size > 0 ? size : null,
    phone: (forOther ? s('recipient_phone') : '') || s('phone'),
    pickupBy: s('pickup') === 'other' ? s('pickup_name') : filler,
    filledBy: forOther ? filler : '',
    registeredAt: created,
    kit,
  };
}

export type Stock = Record<string, number>;

/** Items needed for every family not packed yet, by item id. */
export function stillNeeded(plan: MealPlan, families: Family[]): Stock {
  const out: Stock = {};
  for (const f of families) {
    if (f.kit.packed_at) continue;
    for (const { item, qty } of kitFor(plan, tierFor(plan, f.size))) out[item.id] = (out[item.id] ?? 0) + qty;
  }
  return out;
}
