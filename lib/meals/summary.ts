import { EVENTS, stillNeeded, tierFor, type Family, type MealEvent, type MealPlan, type Stock } from './logic';

export type Attention = { tone: 'warn' | 'info'; text: string; href?: string };

/** The numbers and to-do list for an event's dashboard. */
export function summarize(event: MealEvent, plan: MealPlan, families: Family[], stock: Stock) {
  const people = families.reduce((n, f) => n + (f.size ?? 0), 0);
  const packed = families.filter((f) => f.kit.packed_at).length;
  const pickedUp = families.filter((f) => f.kit.picked_up_at).length;
  const bySize = plan.tiers.map((t) => ({ tier: t, count: families.filter((f) => tierFor(plan, f.size)?.id === t.id).length }));
  const needed = stillNeeded(plan, families);
  const base = `/admin/meals/${event}`;

  const attention: Attention[] = [];
  const shortages: string[] = [];
  for (const item of plan.items) {
    const have = stock[item.id] ?? 0;
    if (have < 0) attention.push({ tone: 'warn', text: `${item.name} shows ${have} on hand. Recount it.`, href: `${base}/inventory` });
    const short = (needed[item.id] ?? 0) - Math.max(have, 0);
    if (short > 0) shortages.push(`${item.name} (${short})`);
  }
  if (shortages.length) {
    attention.unshift({
      tone: 'warn',
      text: `Still needed for the families not packed yet: ${shortages.join(', ')}.`,
      href: `${base}/inventory`,
    });
  }
  const noSize = families.filter((f) => !f.size);
  if (noSize.length) {
    attention.push({
      tone: 'warn',
      text: `${noSize.length} famil${noSize.length === 1 ? 'y has' : 'ies have'} no family size (${noSize.map((f) => f.code).join(', ')}). They get a ${plan.tiers[0]?.name ?? 'first'} kit.`,
    });
  }
  const started = families.filter((f) => !f.kit.packed_at && f.kit.checked.length > 0);
  if (started.length) {
    attention.push({ tone: 'info', text: `${started.length} kit${started.length === 1 ? '' : 's'} started but not finished.`, href: `${base}/pack` });
  }
  const override = families.filter((f) => f.kit.pickup_override && f.kit.picked_up_at);
  if (override.length) {
    attention.push({ tone: 'warn', text: `${override.length} meal${override.length === 1 ? ' was' : 's were'} picked up before being packed.`, href: `${base}/pickup` });
  }
  const waiting = families.filter((f) => f.kit.packed_at && !f.kit.picked_up_at);
  if (waiting.length) {
    attention.push({ tone: 'info', text: `${waiting.length} packed meal${waiting.length === 1 ? ' is' : 's are'} waiting for pickup.`, href: `${base}/pickup` });
  }

  return { name: EVENTS[event].name, families: families.length, people, packed, pickedUp, bySize, needed, attention };
}
