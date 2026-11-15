import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import DonationsList from '@/components/admin/meals/DonationsList';
import SlotsEditor from '@/components/admin/meals/SlotsEditor';
import { requireAdmin } from '@/lib/auth';
import { nowInPoolville, slotEnded, slotLabel, takenIn } from '@/lib/meals/dropoff';
import { EVENTS, isMealEvent } from '@/lib/meals/logic';
import { getPlan, getPledges, getSlots } from '@/lib/meals/store';

export default async function DonationsPage({ params }: { params: Promise<{ event: string }> }) {
  await requireAdmin();
  const { event } = await params;
  if (!isMealEvent(event)) notFound();

  let plan, slots, pledges;
  try {
    [{ plan }, slots, pledges] = await Promise.all([getPlan(event), getSlots(event), getPledges(event)]);
  } catch (e) {
    console.error('donations load failed', e);
    return (
      <p className="error">
        Could not load donations. If this is the first time, run the latest supabase/schema.sql in Supabase.
      </p>
    );
  }
  const now = nowInPoolville();
  const today = now.slice(0, 10);
  const ended = new Set(slots.filter((s) => slotEnded(s, now)).map((s) => s.id));
  const promised = pledges.filter((p) => p.status === 'promised' && p.slot_id && !ended.has(p.slot_id)).length;
  const received = pledges.filter((p) => p.status === 'received').length;
  const noShow = pledges.filter((p) => p.status === 'promised' && p.slot_id && ended.has(p.slot_id)).length;
  const publicPath = `/donate/${event}`;

  return (
    <>
      <p>
        <Link className="textlink" href={`/admin/meals/${event}`}>
          ← {EVENTS[event].name} meals
        </Link>
      </p>
      <div className="admin-title">
        <div>
          <h1>{EVENTS[event].name} food donations</h1>
          <p className="fine">
            Share this page so neighbors can sign up to bring food:{' '}
            <a className="textlink" href={publicPath} target="_blank" rel="noopener noreferrer">
              {publicPath} ↗
            </a>{' '}
            (Spanish: <a href={`${publicPath}?lang=es`}>{publicPath}?lang=es</a>)
          </p>
        </div>
      </div>

      <div className="stats">
        <div className="stat-box">
          <p className="stat-number">{promised}</p>
          <p className="stat-label">Coming</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">{received}</p>
          <p className="stat-label">Received</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">{noShow}</p>
          <p className="stat-label">Didn&apos;t come</p>
        </div>
      </div>

      <section className="card">
        <h2>Drop-off times</h2>
        <p className="fine">
          Donors choose one of these. Times that have ended or are full disappear from the public page. Promises from a
          time that has ended without a check-in stop counting as committed.
        </p>
        <SlotsEditor event={event} slots={slots} signedUp={Object.fromEntries(slots.map((s) => [s.id, takenIn(pledges, s.id)]))} />
      </section>

      <h2 className="editor-h">Who is coming</h2>
      <AutoRefresh />
      <DonationsList
        event={event}
        items={plan.items}
        pledges={pledges}
        slots={slots.map((s) => ({ id: s.id, label: slotLabel(s), place: s.place, ended: ended.has(s.id), today: s.day === today }))}
      />
    </>
  );
}
