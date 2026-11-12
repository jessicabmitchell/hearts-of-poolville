import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import InventoryCounter from '@/components/admin/meals/InventoryCounter';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent, stillNeeded } from '@/lib/meals/logic';
import { getEntries, getFamilies, getPlan, getStock } from '@/lib/meals/store';

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function InventoryPage({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let plan, families, stock, entries;
  try {
    [{ plan }, families, stock, entries] = await Promise.all([getPlan(event), getFamilies(event), getStock(event), getEntries(event)]);
  } catch (e) {
    console.error('inventory load failed', e);
    return <p className="error">Could not load inventory. Check the Supabase settings and try again.</p>;
  }
  const needed = stillNeeded(plan, families);
  const names = new Map(plan.items.map((i) => [i.id, i.name]));

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} inventory</h1>
          <p className="fine">
            Tap to add donations as you count them. “Needed” is for families not packed yet. Packing a meal takes its items
            out of inventory.
          </p>
        </div>
        <Link className="textlink" href={`/admin/meals/${event}/plan`}>
          Change items
        </Link>
      </div>
      <AutoRefresh />
      <InventoryCounter
        event={event}
        rows={plan.items.map((item) => ({ item, onHand: stock[item.id] ?? 0, needed: needed[item.id] ?? 0 }))}
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
