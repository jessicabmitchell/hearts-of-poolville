import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import PickupMode from '@/components/admin/meals/PickupMode';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent } from '@/lib/meals/logic';
import { getFamilies } from '@/lib/meals/store';

export default async function PickupPage({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let families;
  try {
    families = await getFamilies(event);
  } catch (e) {
    console.error('pickup load failed', e);
    return <p className="error">Could not load families. Check the Supabase settings and try again.</p>;
  }

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} pickup</h1>
          <p className="fine">Search for the family, then mark their meal picked up.</p>
        </div>
      </div>
      <AutoRefresh />
      <PickupMode event={event} families={families} />
    </>
  );
}
