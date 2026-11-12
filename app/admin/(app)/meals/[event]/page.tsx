import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, isMealEvent } from '@/lib/meals/logic';
import { getFamilies, getPlan, getStock } from '@/lib/meals/store';
import { summarize } from '@/lib/meals/summary';

export default async function MealDashboard({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let data;
  try {
    const [{ plan }, families, stock] = await Promise.all([getPlan(event), getFamilies(event), getStock(event)]);
    data = summarize(event, plan, families, stock);
  } catch (e) {
    console.error('meal dashboard failed', e);
    return (
      <p className="error">
        Could not load the meal data. If this is the first time, run the latest supabase/schema.sql in Supabase.
      </p>
    );
  }
  const base = `/admin/meals/${event}`;

  return (
    <>
      <div className="admin-title">
        <h1>{EVENTS[event].name} meals</h1>
        <AutoRefresh />
      </div>

      <div className="stats">
        <div className="stat-box">
          <p className="stat-number">{data.families}</p>
          <p className="stat-label">Registered families</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">{data.people}</p>
          <p className="stat-label">People to feed</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">
            {data.packed}
            <span className="stat-of"> / {data.families}</span>
          </p>
          <p className="stat-label">Meals packed</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">
            {data.pickedUp}
            <span className="stat-of"> / {data.families}</span>
          </p>
          <p className="stat-label">Meals picked up</p>
        </div>
      </div>

      <p className="fine kit-sizes">
        Kits needed:{' '}
        {data.bySize.map(({ tier, count }, i) => (
          <span key={tier.id}>
            {i > 0 && ' · '}
            <strong>{count}</strong> {tier.name.toLowerCase()} ({tier.min}
            {tier.max ? `–${tier.max}` : '+'} people)
          </span>
        ))}
      </p>

      <section className="card">
        <h2>Needs attention</h2>
        {data.attention.length === 0 ? (
          <p className="fine">Nothing right now.</p>
        ) : (
          <ul className="attention">
            {data.attention.map((a, i) => (
              <li key={i} className={a.tone === 'warn' ? 'warn' : undefined}>
                {a.href ? <Link href={a.href}>{a.text}</Link> : a.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="cards modes">
        <Link className="card mode" href={`${base}/inventory`}>
          <h2>Inventory</h2>
          <p className="fine">Count donations as they come in, and see what is still needed.</p>
        </Link>
        <Link className="card mode" href={`${base}/plan`}>
          <h2>Meal plan</h2>
          <p className="fine">Kit sizes and what goes in each kit.</p>
        </Link>
        <Link className="card mode" href={`${base}/pack`}>
          <h2>Packing</h2>
          <p className="fine">Pack one family at a time with a checklist.</p>
        </Link>
        <Link className="card mode" href={`${base}/pickup`}>
          <h2>Pickup</h2>
          <p className="fine">Check families in as they collect their meal.</p>
        </Link>
      </div>
    </>
  );
}
