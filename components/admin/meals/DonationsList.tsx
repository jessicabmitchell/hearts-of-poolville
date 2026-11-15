'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { movePledge, receivePledge, setPledgeCancelled, undoReceive, type MealResult } from '@/app/admin/meals/actions';
import type { Pledge } from '@/lib/meals/dropoff';
import { amount, type KitItem } from '@/lib/meals/logic';
import { tryAction } from './tryAction';

export type SlotView = { id: string; label: string; place: string; ended: boolean; today: boolean };

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const digits = (s: string) => s.replace(/\D/g, '');

function PledgeRow({ event, p, items, slots, ended }: { event: string; p: Pledge; items: KitItem[]; slots: SlotView[]; ended: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checking, setChecking] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(p.items ?? {}).map(([k, n]) => [k, String(n)])),
  );
  const [confirm, setConfirm] = useState<'cancel' | 'undo' | null>(null);
  const [error, setError] = useState('');
  const name = (id: string) => items.find((i) => i.id === id);
  const list = (rec: Record<string, number> | null) =>
    Object.entries(rec ?? {})
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${name(id)?.name ?? id}: ${amount(n, name(id)?.unit ?? '')}`)
      .join(' · ');

  const run = (fn: () => Promise<MealResult>) =>
    start(async () => {
      const r = await tryAction(fn);
      setConfirm(null);
      if (r.ok) {
        setChecking(false);
        setError('');
      } else setError(r.message);
      router.refresh();
    });

  const status =
    p.status === 'received'
      ? { text: `Received ${p.received_at ? when.format(new Date(p.received_at)) : ''}`, tone: 'tone-open' }
      : p.status === 'cancelled'
        ? { text: 'Cancelled', tone: '' }
        : ended
          ? { text: "Didn't come", tone: 'tone-warn' }
          : { text: 'Promised', tone: 'tone-soon' };

  return (
    <li className={`pledge-row ${p.status}`}>
      <div className="pledge-info">
        <p className="pickup-name">
          <strong>{p.name}</strong> <span className="pickup-code">{p.code}</span>{' '}
          <span className={`pill ${status.tone}`}>{status.text}</span>
          {p.language === 'es' && <span className="tag">Spanish</span>}
        </p>
        <p className="fine">{[p.phone, p.email].filter(Boolean).join(' · ')}</p>
        <p>
          {p.status === 'received' ? (
            <>
              <span className="fine">Brought:</span> {list(p.received) || 'Nothing counted'}
              <span className="fine"> (promised {list(p.items) || 'other items'})</span>
            </>
          ) : (
            list(p.items) || <span className="fine">No meal-plan items</span>
          )}
        </p>
        {p.other && <p className="fine">Also: {p.other}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {checking ? (
        <div className="checkin">
          <p className="fine">How many of each did they bring?</p>
          {items
            .filter((i) => i.id in counts || (p.items ?? {})[i.id])
            .map((i) => (
              <label key={i.id} className="checkin-row">
                <span>
                  {i.name} <span className="fine">({i.unit})</span>
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={counts[i.id] ?? ''}
                  onChange={(e) => setCounts({ ...counts, [i.id]: e.target.value })}
                />
              </label>
            ))}
          <label className="checkin-row">
            <span className="fine">Add another item</span>
            <select
              value=""
              onChange={(e) => e.target.value && setCounts({ ...counts, [e.target.value]: '1' })}
              aria-label="Add another item they brought"
            >
              <option value="">Choose…</option>
              {items
                .filter((i) => !(i.id in counts))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="tools">
            <button
              type="button"
              className="btn primary"
              disabled={pending}
              onClick={() =>
                run(() =>
                  receivePledge(
                    event,
                    p.id,
                    Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, Number.parseInt(n, 10) || 0])),
                  ),
                )
              }
            >
              {pending ? 'Saving…' : 'Mark received'}
            </button>
            <button type="button" className="btn ghost small" onClick={() => setChecking(false)}>
              Cancel
            </button>
          </div>
          <p className="fine">Received items are added to inventory.</p>
        </div>
      ) : (
        <div className="pickup-actions">
          {p.status === 'promised' && (
            <button type="button" className="btn primary big" onClick={() => setChecking(true)}>
              Check in
            </button>
          )}
          {p.status === 'promised' && (
            <select
              className="move"
              value=""
              aria-label="Move to another drop-off time"
              onChange={(e) => e.target.value && run(() => movePledge(event, p.id, e.target.value))}
            >
              <option value="">Move to…</option>
              {slots
                .filter((s) => s.id !== p.slot_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </select>
          )}
          {p.status === 'promised' &&
            (confirm === 'cancel' ? (
              <span className="tools">
                <button type="button" className="btn danger small" disabled={pending} onClick={() => run(() => setPledgeCancelled(event, p.id, true))}>
                  Yes, cancel it
                </button>
                <button type="button" className="btn ghost small" onClick={() => setConfirm(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="btn ghost small" onClick={() => setConfirm('cancel')}>
                Cancel sign-up
              </button>
            ))}
          {p.status === 'received' &&
            (confirm === 'undo' ? (
              <span className="tools">
                <button type="button" className="btn danger small" disabled={pending} onClick={() => run(() => undoReceive(event, p.id))}>
                  Yes, undo and take items out of inventory
                </button>
                <button type="button" className="btn ghost small" onClick={() => setConfirm(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="btn ghost small" onClick={() => setConfirm('undo')}>
                Undo check-in
              </button>
            ))}
          {p.status === 'cancelled' && (
            <button type="button" className="btn ghost small" disabled={pending} onClick={() => run(() => setPledgeCancelled(event, p.id, false))}>
              Restore
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function DonationsList({
  event,
  items,
  slots,
  pledges,
}: {
  event: string;
  items: KitItem[];
  slots: SlotView[];
  pledges: Pledge[];
}) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'upcoming' | 'all'>('upcoming');
  const needle = search.trim().toLowerCase();
  const needleDigits = digits(needle);
  const match = (p: Pledge) =>
    !needle ||
    `${p.code} ${p.name} ${p.email ?? ''}`.toLowerCase().includes(needle) ||
    (needleDigits.length > 0 && (digits(p.phone ?? '').includes(needleDigits) || p.number === Number(needleDigits)));

  // When searching, look through every time, so a donor who came on the wrong day is still found.
  const groups = slots
    .filter((s) => needle || show === 'all' || !s.ended)
    .map((s) => ({ slot: s, list: pledges.filter((p) => p.slot_id === s.id && match(p)) }))
    .filter((g) => g.list.length > 0 || (!needle && !g.slot.ended));

  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Name, phone, or donation code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Find a donor" />
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} aria-label="Which drop-off times to show">
          <option value="upcoming">Today and later</option>
          <option value="all">All times, including past</option>
        </select>
      </div>
      {groups.length === 0 ? (
        <p className="empty">{needle ? 'No one matches that search.' : 'No upcoming drop-off times. Add one above.'}</p>
      ) : (
        groups.map(({ slot, list }) => (
          <section key={slot.id} className="slot-group">
            <h3>
              {slot.label}
              {slot.place && <span className="fine"> · {slot.place}</span>}
              {slot.today && <span className="pill tone-soon">Today</span>}
              <span className="fine"> · {list.filter((p) => p.status !== 'cancelled').length} signed up</span>
            </h3>
            {list.length === 0 ? (
              <p className="fine">No one signed up yet.</p>
            ) : (
              <ul className="pickup-list">
                {list.map((p) => (
                  <PledgeRow key={`${p.id}-${p.status}-${p.slot_id}`} event={event} p={p} items={items} slots={slots} ended={slot.ended} />
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </>
  );
}
