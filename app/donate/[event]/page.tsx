import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LangToggle from '@/components/LangToggle';
import DonateForm from '@/components/donate/DonateForm';
import { dict, toLang } from '@/lib/i18n';
import { availableToPromise, committed, nowInPoolville, slotEnded, slotLabel, takenIn } from '@/lib/meals/dropoff';
import { EVENTS, isMealEvent, stillNeeded } from '@/lib/meals/logic';
import { getFamilies, getPlan, getPledges, getSlots, getStock } from '@/lib/meals/store';

export const metadata: Metadata = { title: 'Donate food' };
export const dynamic = 'force-dynamic';

/** Public page where neighbors promise food and pick a drop-off time. Shows totals only, never families. */
export default async function DonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ event: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { event } = await params;
  if (!isMealEvent(event)) notFound();
  const lang = toLang((await searchParams).lang);
  const d = dict(lang);
  const t = d.donate;
  const eventName = lang === 'es' ? EVENTS[event].nameEs : EVENTS[event].name;

  let body;
  try {
    const [{ plan }, families, stock, slots, pledges] = await Promise.all([
      getPlan(event),
      getFamilies(event),
      getStock(event),
      getSlots(event),
      getPledges(event),
    ]);
    const now = nowInPoolville();
    const available = availableToPromise(plan, stillNeeded(plan, families), stock);
    const promised = committed(pledges, slots, now);
    const open = slots
      .filter((s) => !slotEnded(s, now))
      .map((s) => ({ s, spotsLeft: s.capacity === null ? null : Math.max(s.capacity - takenIn(pledges, s.id), 0) }))
      .filter(({ spotsLeft }) => spotsLeft === null || spotsLeft > 0);

    body =
      open.length === 0 ? (
        <div className="panel">
          <p>{t.noSlots}</p>
        </div>
      ) : (
        <DonateForm
          event={event}
          lang={lang}
          items={plan.items.map((i) => ({
            id: i.id,
            name: (lang === 'es' && i.nameEs) || i.name,
            unit: (lang === 'es' && i.unitEs) || i.unit,
            left: Math.max((available[i.id] ?? 0) - (promised[i.id] ?? 0), 0),
          }))}
          slots={open.map(({ s, spotsLeft }) => ({ id: s.id, label: slotLabel(s, lang), place: s.place, spotsLeft }))}
        />
      );
  } catch (e) {
    console.error('donate page failed', e);
    body = (
      <div className="panel">
        <p>{d.errors.closed}</p>
      </div>
    );
  }

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path={`/donate/${event}`} lang={lang} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="h-page">{t.title.replace('{event}', eventName)}</h1>
      <p className="lede small">{t.lede}</p>
      {body}
    </main>
  );
}
