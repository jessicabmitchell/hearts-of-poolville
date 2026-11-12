'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { isMealEvent, kitFor, normalizePlan, tierFor, type MealEvent } from '@/lib/meals/logic';
import { getFamilies, getPlan, savePlan } from '@/lib/meals/store';
import { createAdminClient } from '@/lib/supabase/admin';

export type MealResult = { ok: true } | { ok: false; message: string };

const fail = (message: string) => ({ ok: false as const, message });
const TRY_AGAIN = 'That did not save. Check your connection and try again.';

function eventOf(v: string): MealEvent {
  if (!isMealEvent(v)) throw new Error('Unknown event');
  return v;
}

const refresh = (event: MealEvent) => revalidatePath(`/admin/meals/${event}`, 'layout');

// ---------- Meal plan ----------

export async function saveMealPlan(eventName: string, plan: unknown): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const clean = normalizePlan(plan);
  if (clean.tiers.length === 0) return fail('Add at least one kit size.');
  try {
    await savePlan(event, clean, user.email ?? 'unknown');
  } catch (e) {
    console.error('saveMealPlan failed', e);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  return { ok: true };
}

// ---------- Inventory ----------

export type StockResult = { ok: true; onHand: number; at: number } | { ok: false; message: string };

/**
 * Add or take away stock. Sends back the item's new total and when it was read, so the page can
 * show it right away without reloading everything. Admin pages always load fresh data, so there
 * is nothing to rebuild here.
 */
export async function changeStock(
  eventName: string,
  itemId: string,
  change: number,
  reason: 'donation' | 'correction',
): Promise<StockResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const n = Math.round(change);
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 10000) return fail('Enter a number other than zero.');
  const { plan } = await getPlan(event);
  if (!plan.items.some((i) => i.id === itemId)) return fail('That item is not on the meal plan.');
  const { error } = await createAdminClient()
    .from('inventory_entries')
    .insert({ event, item_id: itemId, change: n, reason: reason === 'donation' && n > 0 ? 'donation' : 'correction', created_by: user.email });
  if (error) {
    console.error('changeStock failed', error);
    return fail(TRY_AGAIN);
  }
  const { data } = await createAdminClient()
    .from('inventory_totals')
    .select('on_hand')
    .eq('event', event)
    .eq('item_id', itemId)
    .maybeSingle();
  return { ok: true, onHand: Number(data?.on_hand) || 0, at: Date.now() };
}

/** Take back a count by adding the opposite amount, so the history still shows both. */
export async function undoEntry(eventName: string, entryId: number): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const db = createAdminClient();
  const { data: entry } = await db.from('inventory_entries').select('*').eq('id', entryId).eq('event', event).maybeSingle();
  if (!entry || (entry.reason !== 'donation' && entry.reason !== 'correction')) {
    return fail('Only counted donations and corrections can be undone here.');
  }
  const { error } = await db
    .from('inventory_entries')
    .insert({ event, item_id: entry.item_id, change: -entry.change, reason: 'correction', created_by: user.email });
  if (error) return fail(TRY_AGAIN);
  return { ok: true };
}

// ---------- Packing ----------

export async function saveChecklist(eventName: string, responseId: string, checked: string[]): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const clean = Array.from(new Set(checked.map(String))).slice(0, 100);
  const { error } = await createAdminClient()
    .from('meal_kits')
    .update({ checked: clean })
    .eq('response_id', responseId)
    .eq('event', event)
    .is('packed_at', null);
  if (error) return fail(TRY_AGAIN);
  return { ok: true };
}

export async function packMeal(eventName: string, responseId: string, checked: string[]): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const [{ plan }, families] = await Promise.all([getPlan(event), getFamilies(event)]);
  const family = families.find((f) => f.id === responseId);
  if (!family) return fail('That family could not be found.');

  // Work out the kit on the server, from the meal plan, not from what the page sent.
  const kit = kitFor(plan, tierFor(plan, family.size));
  if (kit.some(({ item }) => !checked.includes(item.id))) return fail('Check off every item before marking the meal packed.');
  const items = Object.fromEntries(kit.map(({ item, qty }) => [item.id, qty]));

  const { data, error } = await createAdminClient().rpc('pack_meal', {
    p_response: responseId,
    p_items: items,
    p_by: user.email ?? 'unknown',
  });
  if (error) {
    console.error('packMeal failed', error);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  if (data === 'already_packed') return fail('Someone already marked this meal packed.');
  if (data !== 'ok') return fail('That family could not be found.');
  return { ok: true };
}

export async function reopenMeal(eventName: string, responseId: string): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const { data, error } = await createAdminClient().rpc('unpack_meal', { p_response: responseId, p_by: user.email ?? 'unknown' });
  if (error) {
    console.error('reopenMeal failed', error);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  if (data === 'picked_up') return fail('This meal was already picked up. Undo the pickup first.');
  if (data === 'not_packed') return fail('This meal is not packed.');
  if (data !== 'ok') return fail('That family could not be found.');
  return { ok: true };
}

// ---------- Pickup ----------

export async function setPickup(
  eventName: string,
  responseId: string,
  how: 'pickup' | 'override' | 'undo',
): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const { data, error } = await createAdminClient().rpc('set_pickup', {
    p_response: responseId,
    p_by: user.email ?? 'unknown',
    p_override: how === 'override',
    p_undo: how === 'undo',
  });
  if (error) {
    console.error('setPickup failed', error);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  if (data === 'not_packed') return fail('This meal is not packed yet.');
  if (data === 'already') return fail('Someone already marked this meal picked up.');
  if (data === 'not_picked_up') return fail('This meal was not marked picked up.');
  if (data !== 'ok') return fail('That family could not be found.');
  return { ok: true };
}
