'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { nowInPoolville } from '@/lib/meals/dropoff';
import { EVENTS, isMealEvent, kitFor, normalizePlan, tierFor, type MealEvent } from '@/lib/meals/logic';
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

// ---------- Donations ----------

export type SlotInput = {
  id?: string;
  day: string;
  start_time: string;
  end_time: string;
  place: string;
  capacity: number | null;
};

export async function saveSlot(eventName: string, slot: SlotInput): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.day)) return fail('Choose a date.');
  if (!time.test(slot.start_time) || !time.test(slot.end_time)) return fail('Enter a start and end time.');
  if (slot.end_time <= slot.start_time) return fail('The end time needs to be after the start time.');
  const capacity = slot.capacity && slot.capacity > 0 ? Math.min(Math.round(slot.capacity), 10000) : null;
  const row = {
    event,
    day: slot.day,
    start_time: slot.start_time,
    end_time: slot.end_time,
    place: String(slot.place ?? '').trim().slice(0, 200),
    capacity,
  };
  const db = createAdminClient();
  const { error } = slot.id
    ? await db.from('dropoff_slots').update(row).eq('id', slot.id).eq('event', event)
    : await db.from('dropoff_slots').insert(row);
  if (error) {
    console.error('saveSlot failed', error);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  revalidatePath(`/donate/${event}`);
  revalidatePath('/');
  return { ok: true };
}

export async function deleteSlot(eventName: string, slotId: string): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const db = createAdminClient();
  const { count } = await db.from('pledges').select('id', { count: 'exact', head: true }).eq('slot_id', slotId);
  if (count) return fail('Donors are signed up for this time. Move them to another time first.');
  const { error } = await db.from('dropoff_slots').delete().eq('id', slotId).eq('event', event);
  if (error) return fail(TRY_AGAIN);
  refresh(event);
  return { ok: true };
}

export async function receivePledge(eventName: string, pledgeId: string, received: Record<string, number>): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const { plan } = await getPlan(event);
  const clean: Record<string, number> = {};
  for (const item of plan.items) {
    const n = Math.round(Number(received[item.id]));
    if (Number.isFinite(n) && n > 0) clean[item.id] = Math.min(n, 9999);
  }
  const { data, error } = await createAdminClient().rpc('receive_pledge', {
    p_id: pledgeId,
    p_received: clean,
    p_by: user.email ?? 'unknown',
  });
  if (error) {
    console.error('receivePledge failed', error);
    return fail(TRY_AGAIN);
  }
  refresh(event);
  if (data === 'already') return fail('Someone already checked this donor in.');
  if (data === 'cancelled') return fail('This sign-up was cancelled. Restore it first.');
  if (data !== 'ok') return fail('That sign-up could not be found.');
  return { ok: true };
}

export async function undoReceive(eventName: string, pledgeId: string): Promise<MealResult> {
  const user = await requireAdmin();
  const event = eventOf(eventName);
  const { data, error } = await createAdminClient().rpc('undo_receive', { p_id: pledgeId, p_by: user.email ?? 'unknown' });
  if (error) return fail(TRY_AGAIN);
  refresh(event);
  if (data !== 'ok') return fail('This donor was not checked in.');
  return { ok: true };
}

/** Cancel a promise (it stops counting as committed) or bring a cancelled one back. */
export async function setPledgeCancelled(eventName: string, pledgeId: string, cancelled: boolean): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const { data, error } = await createAdminClient()
    .from('pledges')
    .update({ status: cancelled ? 'cancelled' : 'promised' })
    .eq('id', pledgeId)
    .eq('event', event)
    .eq('status', cancelled ? 'promised' : 'cancelled')
    .select('id');
  if (error) return fail(TRY_AGAIN);
  refresh(event);
  revalidatePath(`/donate/${event}`);
  if (!data?.length) return fail('That sign-up has changed. Reload the page.');
  return { ok: true };
}

export async function movePledge(eventName: string, pledgeId: string, slotId: string): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const db = createAdminClient();
  const { data: slot } = await db.from('dropoff_slots').select('id').eq('id', slotId).eq('event', event).maybeSingle();
  if (!slot) return fail('Choose a drop-off time.');
  const { error } = await db.from('pledges').update({ slot_id: slotId }).eq('id', pledgeId).eq('event', event);
  if (error) return fail(TRY_AGAIN);
  refresh(event);
  return { ok: true };
}

/**
 * Record a promise a donor made in person or by phone, from the Inventory page. It is saved like an
 * online sign-up, so it shows on the Donations page and can be checked in. The drop-off time is
 * optional; a promise without one counts until it is received or cancelled. Volunteers may record
 * more than is still needed; a full drop-off time is still refused.
 */
export async function addPromise(
  eventName: string,
  input: { itemId: string; qty: number; name: string; phone: string; slotId: string | null },
): Promise<MealResult> {
  await requireAdmin();
  const event = eventOf(eventName);
  const qty = Math.round(Number(input.qty));
  const name = String(input.name ?? '').trim().slice(0, 100);
  const phone = String(input.phone ?? '').trim().slice(0, 40);
  if (!Number.isInteger(qty) || qty < 1 || qty > 9999) return fail('Enter how many they will bring.');
  if (!name) return fail("Enter the donor's name.");
  const { plan } = await getPlan(event);
  if (!plan.items.some((i) => i.id === input.itemId)) return fail('That item is not on the meal plan.');

  const { data, error } = await createAdminClient().rpc('add_pledge', {
    p_event: event,
    p_prefix: EVENTS[event].donationPrefix,
    p_slot: input.slotId || null,
    p_name: name,
    p_phone: phone,
    p_email: '',
    p_items: { [input.itemId]: qty },
    p_other: '',
    p_lang: 'en',
    p_available: { [input.itemId]: 1_000_000 },
    p_now: nowInPoolville(),
  });
  if (error) {
    console.error('addPromise failed', error);
    return fail(TRY_AGAIN);
  }
  const result = data as { code?: string; error?: string };
  if (result.error === 'slot') return fail('That drop-off time has ended. Choose another.');
  if (result.error === 'full') return fail('That drop-off time is full. Choose another or raise its limit.');
  if (!result.code) return fail(TRY_AGAIN);
  refresh(event);
  revalidatePath(`/donate/${event}`);
  return { ok: true };
}
