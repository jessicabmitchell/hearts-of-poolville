// Food donations: drop-off times, donor promises, and what is still needed.

import type { MealPlan, Stock } from './logic';

export type Slot = {
  id: string;
  event: string;
  day: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM'
  end_time: string;
  place: string;
  capacity: number | null;
};

export type Pledge = {
  id: string;
  event: string;
  number: number;
  code: string;
  slot_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  items: Record<string, number>;
  other: string | null;
  language: 'en' | 'es';
  status: 'promised' | 'received' | 'cancelled';
  received: Record<string, number> | null;
  received_at: string | null;
  received_by: string | null;
  created_at: string;
};

/** The current Poolville time as 'YYYY-MM-DD HH:MM', which sorts the same way as slot times. */
export function nowInPoolville(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export const slotEnded = (s: Slot, now: string) => `${s.day} ${s.end_time}` <= now;
export const slotStarted = (s: Slot, now: string) => `${s.day} ${s.start_time}` <= now;

/** "Sat, Nov 21 · 10:00 AM – 12:00 PM" in English or Spanish. */
export function slotLabel(s: Slot, lang: 'en' | 'es' = 'en'): string {
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${s.day}T12:00:00Z`),
  );
  const time = (hm: string) =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`2000-01-01T${hm}:00Z`));
  return `${day} · ${time(s.start_time)} – ${time(s.end_time)}`;
}

/**
 * Whether a promise still counts: not received or cancelled, and either its drop-off time has not
 * passed or it has no set time (a volunteer recorded it without one).
 */
export function stillComing(p: Pledge, slots: Slot[], now: string): boolean {
  if (p.status !== 'promised') return false;
  if (!p.slot_id) return true;
  const slot = slots.find((s) => s.id === p.slot_id);
  return Boolean(slot && !slotEnded(slot, now));
}

/**
 * Items promised and not delivered yet, by item id. Promises whose drop-off time has passed no
 * longer count, so those items show as needed again.
 */
export function committed(pledges: Pledge[], slots: Slot[], now: string): Stock {
  const out: Stock = {};
  for (const p of pledges) {
    if (!stillComing(p, slots, now)) continue;
    for (const [id, n] of Object.entries(p.items ?? {})) out[id] = (out[id] ?? 0) + (Number(n) || 0);
  }
  return out;
}

/** What is still needed before counting promises: needed for families not packed, minus on hand. */
export function availableToPromise(plan: MealPlan, needed: Stock, stock: Stock): Stock {
  const out: Stock = {};
  for (const item of plan.items) out[item.id] = Math.max((needed[item.id] ?? 0) - Math.max(stock[item.id] ?? 0, 0), 0);
  return out;
}

/** Signed-up donors for a slot who have not been cancelled. */
export const takenIn = (pledges: Pledge[], slotId: string) =>
  pledges.filter((p) => p.slot_id === slotId && p.status !== 'cancelled').length;
