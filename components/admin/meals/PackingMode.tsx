'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { packMeal, reopenMeal, saveChecklist } from '@/app/admin/meals/actions';
import { tryAction } from './tryAction';
import { amount, kitFor, tierFor, type Family, type MealPlan, type Stock } from '@/lib/meals/logic';

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function statusOf(f: Family) {
  if (f.kit.picked_up_at) return 'Picked up';
  if (f.kit.packed_at) return 'Packed';
  if (f.kit.checked.length) return 'Packing';
  return 'Not packed';
}

function Checklist({
  event,
  plan,
  family,
  stock,
  onNext,
  hasNext,
}: {
  event: string;
  plan: MealPlan;
  family: Family;
  stock: Stock;
  onNext: () => void;
  hasNext: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState<string[]>(family.kit.checked);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const tier = tierFor(plan, family.size);
  const kit = kitFor(plan, tier);
  const packed = Boolean(family.kit.packed_at);
  const done = kit.filter(({ item }) => checked.includes(item.id)).length;

  // Saves go out one at a time, each with the latest ticks, so quick tapping cannot save an
  // older list over a newer one.
  const latest = useRef(checked);
  const queue = useRef(Promise.resolve());
  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    latest.current = next;
    queue.current = queue.current.then(async () => {
      const r = await tryAction(() => saveChecklist(event, family.id, latest.current));
      if (!r.ok) setMessage({ error: true, text: r.message });
    });
  };

  const pack = () =>
    start(async () => {
      const r = await tryAction(() => packMeal(event, family.id, checked));
      setMessage(r.ok ? { error: false, text: `${family.code} is packed.` } : { error: true, text: r.message });
      router.refresh();
    });

  const reopen = () =>
    start(async () => {
      const r = await tryAction(() => reopenMeal(event, family.id));
      setConfirmReopen(false);
      setMessage(r.ok ? { error: false, text: 'Reopened. Its items are back in inventory.' } : { error: true, text: r.message });
      router.refresh();
    });

  return (
    <section className="card pack-card">
      <div className="card-top">
        <div>
          <h2>
            {family.code} · {family.name}
          </h2>
          <p className="fine">
            {family.size ? `${family.size} people` : 'Family size unknown'} · {tier?.name ?? plan.tiers[0]?.name} kit
          </p>
        </div>
        <span className={`pill ${packed ? 'tone-open' : checked.length ? 'tone-soon' : ''}`}>{statusOf({ ...family, kit: { ...family.kit, checked } })}</span>
      </div>

      {packed ? (
        <>
          <p>
            Packed by {family.kit.packed_by} on {when.format(new Date(family.kit.packed_at!))}.
          </p>
          <ul className="packed-items">
            {Object.entries(family.kit.items ?? {}).map(([id, qty]) => {
              const item = plan.items.find((i) => i.id === id);
              return (
                <li key={id}>
                  {item?.name ?? id}: {amount(qty, item?.unit ?? '')}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="fine">
            {done} of {kit.length} items checked
          </p>
          <ul className="checklist">
            {kit.map(({ item, qty }) => {
              const have = stock[item.id] ?? 0;
              return (
                <li key={item.id}>
                  <label className={checked.includes(item.id) ? 'check-row done' : 'check-row'}>
                    <input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)} />
                    <span className="check-name">{item.name}</span>
                    <span className="check-qty">{amount(qty, item.unit)}</span>
                    {have < qty && (
                      <span className="check-warn">{have > 0 ? `only ${have} in inventory` : 'none in inventory'}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {message && (
        <p role="status" className={message.error ? 'error' : 'fine'}>
          {message.text}
        </p>
      )}

      <div className="pack-actions">
        {!packed && (
          <button type="button" className="btn primary big" disabled={pending || done < kit.length} onClick={pack}>
            {pending ? 'Saving…' : done < kit.length ? `Check ${kit.length - done} more to finish` : 'Mark family packed'}
          </button>
        )}
        {packed && hasNext && (
          <button type="button" className="btn primary big" onClick={onNext}>
            Pack next family →
          </button>
        )}
        {packed && !hasNext && <p className="fine">Every family is packed.</p>}
        {packed && !family.kit.picked_up_at && (
          confirmReopen ? (
            <span className="tools">
              <button type="button" className="btn danger small" disabled={pending} onClick={reopen}>
                Yes, reopen and put items back
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirmReopen(false)}>
                Keep packed
              </button>
            </span>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirmReopen(true)}>
              Reopen this meal
            </button>
          )
        )}
      </div>
    </section>
  );
}

export default function PackingMode({
  event,
  plan,
  families,
  stock,
  startWith,
}: {
  event: string;
  plan: MealPlan;
  families: Family[];
  stock: Stock;
  startWith: string | null;
}) {
  const firstOpen = families.find((f) => !f.kit.packed_at)?.id ?? families[0]?.id ?? null;
  const [selected, setSelected] = useState<string | null>(families.some((f) => f.id === startWith) ? startWith : firstOpen);
  const [search, setSearch] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const family = families.find((f) => f.id === selected) ?? null;
  const packedCount = families.filter((f) => f.kit.packed_at).length;

  const needle = search.trim().toLowerCase();
  const list = families.filter(
    (f) => (!onlyOpen || !f.kit.packed_at || f.id === selected) && (!needle || `${f.code} ${f.name}`.toLowerCase().includes(needle)),
  );
  // The next family without a packed meal, after this one in code order, wrapping around.
  const next = family
    ? [...families.filter((f) => f.number > family.number), ...families.filter((f) => f.number < family.number)].find((f) => !f.kit.packed_at)
    : undefined;

  if (families.length === 0) return <p className="empty">No families have registered yet.</p>;

  return (
    <>
      <p className="progress-line">
        <strong>{packedCount}</strong> of {families.length} meals packed
      </p>
      <div className="filters">
        <input type="search" placeholder="Find a family by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Find a family" />
        <select value={selected ?? ''} onChange={(e) => setSelected(e.target.value)} aria-label="Choose a family">
          {list.map((f) => (
            <option key={f.id} value={f.id}>
              {f.code} · {f.name} · {f.size ?? '?'} people · {statusOf(f)}
            </option>
          ))}
        </select>
        <label className="inline-check">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Hide packed
        </label>
      </div>
      {family ? (
        <Checklist
          key={`${family.id}-${family.kit.packed_at ?? 'open'}`}
          event={event}
          plan={plan}
          family={family}
          stock={stock}
          hasNext={Boolean(next)}
          onNext={() => {
            if (next) setSelected(next.id);
            window.scrollTo(0, 0);
          }}
        />
      ) : (
        <p className="empty">Choose a family above.</p>
      )}
    </>
  );
}
