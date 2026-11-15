'use server';

import { dict, toLang } from '@/lib/i18n';
import { availableToPromise, nowInPoolville, slotLabel } from '@/lib/meals/dropoff';
import { EVENTS, amount, isMealEvent, stillNeeded } from '@/lib/meals/logic';
import { getFamilies, getPlan, getSlots, getStock } from '@/lib/meals/store';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FormState } from '@/lib/types';

const clean = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Save a donor's promise and drop-off time. */
export async function submitPledge(_prev: FormState, formData: FormData): Promise<FormState> {
  // Hidden "website" field: real people leave it empty, form-filling bots do not.
  if (clean(formData.get('website'), 200)) return { status: 'ok' };

  const lang = toLang(formData.get('lang'));
  const d = dict(lang);
  const t = d.donate;
  const event = clean(formData.get('event'), 30);
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === 'string' && k !== 'website' && !k.startsWith('$')) values[k] = v.slice(0, 500);
  const fail = (message: string): FormState => ({ status: 'error', message, values });
  if (!isMealEvent(event)) return fail(d.errors.closed);

  const name = clean(formData.get('name'), 100);
  const phone = clean(formData.get('phone'), 40);
  const email = clean(formData.get('email'), 120);
  const other = clean(formData.get('other'), 500);
  const slotId = clean(formData.get('slot'), 40);

  let plan, families, stock, slots;
  try {
    [{ plan }, families, stock, slots] = await Promise.all([getPlan(event), getFamilies(event), getStock(event), getSlots(event)]);
  } catch (e) {
    console.error('submitPledge load failed', e);
    return fail(d.errors.saveFailed);
  }

  const items: Record<string, number> = {};
  for (const item of plan.items) {
    const n = Number.parseInt(clean(formData.get(`item_${item.id}`), 6), 10);
    if (Number.isInteger(n) && n > 0) items[item.id] = Math.min(n, 999);
  }

  if (Object.keys(items).length === 0 && !other) return fail(t.errors.nothing);
  if (!slotId) return fail(t.errors.slot);
  if (!name) return fail(t.errors.name);
  if (!phone && !email) return fail(d.errors.contact);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(`${t.email}: ${d.errors.email}`);

  const available = availableToPromise(plan, stillNeeded(plan, families), stock);
  const { data, error } = await createAdminClient().rpc('add_pledge', {
    p_event: event,
    p_prefix: EVENTS[event].donationPrefix,
    p_slot: slotId,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_items: items,
    p_other: other,
    p_lang: lang,
    p_available: available,
    p_now: nowInPoolville(),
  });
  if (error) {
    console.error('submitPledge failed', error);
    return fail(d.errors.saveFailed);
  }

  const result = data as { code?: string; error?: string; item?: string; left?: number };
  if (result.error === 'slot') return fail(t.errors.slotGone);
  if (result.error === 'full') return fail(t.errors.slotFull);
  if (result.error === 'too_many') {
    const item = plan.items.find((i) => i.id === result.item);
    const itemName = (lang === 'es' && item?.nameEs) || item?.name || '';
    return fail(t.errors.tooMany.replace('{item}', itemName).replace('{left}', String(result.left ?? 0)));
  }
  if (!result.code) return fail(d.errors.saveFailed);

  // What to show on the thank-you screen.
  const slot = slots.find((s) => s.id === slotId);
  const bring = plan.items
    .filter((i) => items[i.id])
    .map((i) => `${(lang === 'es' && i.nameEs) || i.name}: ${amount(items[i.id], (lang === 'es' && i.unitEs) || i.unit)}`);
  if (other) bring.push(other);
  return {
    status: 'ok',
    values: { code: result.code, slot: slot ? slotLabel(slot, lang) : '', place: slot?.place ?? '', bring },
  };
}
