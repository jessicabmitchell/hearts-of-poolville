import 'server-only';
import { getResponses } from '@/lib/forms/store';
import { createAdminClient } from '@/lib/supabase/admin';
import { EVENTS, defaultPlan, familyFrom, normalizePlan, type Family, type Kit, type MealEvent, type MealPlan, type Stock } from './logic';

export type StoredPlan = { plan: MealPlan; updatedAt: string | null; updatedBy: string | null };

export async function getPlan(event: MealEvent): Promise<StoredPlan> {
  const { data, error } = await createAdminClient()
    .from('meal_plans')
    .select('config, updated_at, updated_by')
    .eq('event', event)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { plan: defaultPlan(), updatedAt: null, updatedBy: null };
  return { plan: normalizePlan(data.config), updatedAt: data.updated_at, updatedBy: data.updated_by };
}

export async function savePlan(event: MealEvent, plan: MealPlan, by: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('meal_plans')
    .upsert({ event, config: plan, updated_at: new Date().toISOString(), updated_by: by }, { onConflict: 'event' });
  if (error) throw error;
}

/** Every registered family with its pickup code and packing and pickup status, in code order. */
export async function getFamilies(event: MealEvent): Promise<Family[]> {
  const db = createAdminClient();
  const { error: codeError } = await db.rpc('assign_meal_codes', { p_event: event, p_prefix: EVENTS[event].prefix });
  if (codeError) throw codeError;
  const [responses, kits] = await Promise.all([
    getResponses(event),
    db.from('meal_kits').select('*').eq('event', event).limit(5000),
  ]);
  if (kits.error) throw kits.error;
  const byId = new Map((kits.data as Kit[]).map((k) => [k.response_id, k]));
  return responses
    .filter((r) => byId.has(r.id))
    .map((r) => familyFrom(r.id, r.created_at, r.answers ?? {}, byId.get(r.id)!))
    .sort((a, b) => a.number - b.number);
}

export async function getStock(event: MealEvent): Promise<Stock> {
  const { data, error } = await createAdminClient().from('inventory_totals').select('item_id, on_hand').eq('event', event);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.item_id as string, Number(r.on_hand) || 0]));
}

export type Entry = {
  id: number;
  item_id: string;
  change: number;
  reason: 'donation' | 'correction' | 'packed' | 'unpacked';
  response_id: string | null;
  created_at: string;
  created_by: string | null;
};

export async function getEntries(event: MealEvent, limit = 40): Promise<Entry[]> {
  const { data, error } = await createAdminClient()
    .from('inventory_entries')
    .select('*')
    .eq('event', event)
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Entry[];
}
