import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import InventoryCounter from '@/components/admin/meals/InventoryCounter';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent, stillNeeded } from '@/lib/meals/logic';
import { committed, nowInPoolville, slotEnded, slotLabel, stillComing } from '@/lib/meals/dropoff';
import type { OpenPromise } from '@/components/admin/meals/InventoryCounter';
import { getEntries, getFamilies, getPlan, getPledges, getSlots, getStock } from '@/lib/meals/store';

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function InventoryPage({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let plan, families, stock, entries, slots, pledges;
  // Taken before reading, so a total sent back by a later save always counts as newer.
  const loadedAt = Date.now();
  try {
    [{ plan }, families, stock, entries, slots, pledges] = await Promise.all([
      getPlan(event),
      getFamilies(event),
      getStock(event),
      getEntries(event),
      getSlots(event),
      getPledges(event),
    ]);
  } catch (e) {
    console.error('inventory load failed', e);
    return <p className="error">Could not load inventory. Check the Supabase settings and try again.</p>;
  }
  const needed = stillNeeded(plan, families);
  const now = nowInPoolville();
  const promised = committed(pledges, slots, now);
  // Promises still coming, listed under each item they include.
  const promises: Record<string, OpenPromise[]> = {};
  for (const p of pledges) {
    if (!stillComing(p, slots, now)) continue;
    const slot = slots.find((s) => s.id === p.slot_id);
    for (const [itemId, qty] of Object.entries(p.items ?? {})) {
      if (!(qty > 0)) continue;
      (promises[itemId] ??= []).push({ id: p.id, code: p.code, name: p.name, qty, items: p.items, when: slot ? slotLabel(slot) : '' });
    }
  }
  const names = new Map(plan.items.map((i) => [i.id, i.name]));

  return (
    <>
      <p>
        <Link className="textlink" href={`/admin/meals/${event}`}>
          ← {EVENTS[event].name} meals
        </Link>
      </p>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} inventory</h1>
          <p className="fine">
            Tap to add donations as you count them. “Committed” is what donors signed up to bring and have not brought
            yet. “Needed” is for families not packed yet. Packing a meal takes its items out of inventory.
          </p>
        </div>
        <Link className="textlink" href={`/admin/meals/${event}/plan`}>
          Change items
        </Link>
      </div>
      <AutoRefresh />
      <InventoryCounter
        event={event}
        loadedAt={loadedAt}
        promises={promises}
        slots={slots.filter((s) => !slotEnded(s, now)).map((s) => ({ id: s.id, label: `${slotLabel(s)}${s.place ? ` · ${s.place}` : ''}` }))}
        rows={plan.items.map((item) => ({ item, onHand: stock[item.id] ?? 0, needed: needed[item.id] ?? 0, committed: promised[item.id] ?? 0 }))}
        entries={entries.map((e) => ({
          id: e.id,
          itemName: names.get(e.item_id) ?? e.item_id,
          change: e.change,
          reason: e.reason,
          who: e.created_by ?? '',
          when: when.format(new Date(e.created_at)),
          canUndo: e.reason === 'donation' || e.reason === 'correction',
        }))}
      />
    </>
  );
}
