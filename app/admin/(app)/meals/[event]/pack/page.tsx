import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import PackingMode from '@/components/admin/meals/PackingMode';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent } from '@/lib/meals/logic';
import { getFamilies, getPlan, getStock } from '@/lib/meals/store';

export default async function PackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ event: string }>;
  searchParams: Promise<{ family?: string }>;
}) {
  await requireAdmin();
  const { event } = await params;
  const { family } = await searchParams;
  if (!isMealEvent(event)) notFound();

  let plan, families, stock;
  try {
    [{ plan }, families, stock] = await Promise.all([getPlan(event), getFamilies(event), getStock(event)]);
  } catch (e) {
    console.error('packing load failed', e);
    return <p className="error">Could not load families. Check the Supabase settings and try again.</p>;
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} packing</h1>
          <p className="fine">Check off each item as it goes in the box, then mark the family packed.</p>
        </div>
      </div>
      <AutoRefresh />
      <PackingMode event={event} plan={plan} families={families} stock={stock} startWith={family ?? null} />
    </>
  );
}
