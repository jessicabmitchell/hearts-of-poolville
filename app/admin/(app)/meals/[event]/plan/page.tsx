import Link from 'next/link';
import { notFound } from 'next/navigation';
import PlanEditor from '@/components/admin/meals/PlanEditor';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent, tierFor } from '@/lib/meals/logic';
import { getFamilies, getPlan } from '@/lib/meals/store';

export default async function MealPlanPage({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let stored, families;
  try {
    [stored, families] = await Promise.all([getPlan(event), getFamilies(event)]);
  } catch (e) {
    console.error('meal plan load failed', e);
    return <p className="error">Could not load the meal plan. Check the Supabase settings and try again.</p>;
  }
  const { plan } = stored;

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} meal plan</h1>
          <p className="fine">Kit sizes, what goes in each kit, and what each family will get.</p>
        </div>
      </div>

      <PlanEditor key={stored.updatedAt ?? 'new'} event={event} initial={plan} neverSaved={!stored.updatedAt} />

      <section className="card family-needs">
        <h2>What each family needs</h2>
        {families.length === 0 ? (
          <p className="fine">No families registered yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Family</th>
                  <th>People</th>
                  <th>Kit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => {
                  const tier = tierFor(plan, f.size);
                  return (
                    <tr key={f.id}>
                      <td className="nowrap">{f.code}</td>
                      <td>
                        <Link href={`/admin/meals/${event}/pack?family=${f.id}`}>{f.name}</Link>
                      </td>
                      <td>{f.size ?? <span className="error-text">Unknown</span>}</td>
                      <td>{tier?.name ?? plan.tiers[0]?.name}</td>
                      <td>{f.kit.picked_up_at ? 'Picked up' : f.kit.packed_at ? 'Packed' : f.kit.checked.length ? 'Packing' : 'Not packed'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
