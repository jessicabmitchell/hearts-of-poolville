'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { addPromise, changeStock, receivePledge, undoEntry } from '@/app/admin/meals/actions';
import { tryAction } from './tryAction';
import type { KitItem } from '@/lib/meals/logic';

/** `committed` is what donors promised and have not brought yet. */
type Row = { item: KitItem; onHand: number; needed: number; committed: number };
type SlotOption = { id: string; label: string };

/** A promise that includes this item and has not been received yet. */
export type OpenPromise = {
  id: string;
  code: string;
  name: string;
  qty: number;
  /** Everything on the promise, so checking it off receives all of it. */
  items: Record<string, number>;
  /** "Sat, Nov 21 · 10:00 AM", or empty when no time is set. */
  when: string;
};

/** Promises for one item, each with a button to check it off when it arrives. */
function OpenPromises({ event, item, promises, onMessage }: { event: string; item: KitItem; promises: OpenPromise[]; onMessage: (error: boolean, text: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ul className="open-promises">
      {promises.map((p) => {
        const others = Object.keys(p.items).filter((id) => id !== item.id && p.items[id] > 0).length;
        return (
          <li key={p.id}>
            <span>
              <strong>{p.qty}</strong> from {p.name} <span className="fine">· {p.code} · {p.when || 'no set time'}</span>
              {others > 0 && <span className="fine"> · also promised {others} other item{others === 1 ? '' : 's'}</span>}
            </span>
            <button
              type="button"
              className="btn primary small"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await tryAction(() => receivePledge(event, p.id, p.items));
                  onMessage(!r.ok, r.ok ? `Got it: ${p.name}'s promise (${p.code}) added to inventory.` : r.message);
                  router.refresh();
                })
              }
            >
              {others > 0 ? 'Got all of it' : 'Got it'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Record a promise someone made in person or by phone. */
function PromiseForm({ event, item, slots, onDone }: { event: string; item: KitItem; slots: SlotOption[]; onDone: (text: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState('1');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [slotId, setSlotId] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="promise-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await tryAction(() =>
            addPromise(event, { itemId: item.id, qty: Number.parseInt(qty, 10), name, phone, slotId: slotId || null }),
          );
          if (!r.ok) {
            setError(r.message);
            return;
          }
          router.refresh();
          onDone(`Promise saved: ${name} will bring ${qty} ${item.name}.`);
        });
      }}
    >
      <p className="fine">
        Someone promised to bring {item.name.toLowerCase()}. It counts as committed until you check it off here or on the
        Donations page.
      </p>
      <div className="promise-fields">
        <label className="field">
          <span className="bi-label">How many</span>
          <input type="number" min={1} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </label>
        <label className="field">
          <span className="bi-label">Donor&apos;s name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="bi-label">Phone (optional)</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="field">
          <span className="bi-label">Drop-off time (optional)</span>
          <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            <option value="">No set time</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="tools">
        <button type="submit" className="btn primary small" disabled={pending}>
          {pending ? 'Saving…' : 'Save promise'}
        </button>
        <button type="button" className="btn ghost small" onClick={() => onDone('')}>
          Cancel
        </button>
      </div>
    </form>
  );
}

type EntryView = { id: number; itemName: string; change: number; reason: string; who: string; when: string; canUndo: boolean };

const REASONS: Record<string, string> = {
  donation: 'Counted',
  correction: 'Correction',
  packed: 'Packed into a kit',
  unpacked: 'Kit reopened',
};

/** Tap to count donations. Every tap is saved as its own change, so volunteers never overwrite each other. */
export default function InventoryCounter({
  event,
  rows,
  entries,
  loadedAt,
  slots,
  promises,
}: {
  event: string;
  rows: Row[];
  entries: EntryView[];
  /** Drop-off times that have not ended, for recording promises. */
  slots: SlotOption[];
  /** Open promises by item id. */
  promises: Record<string, OpenPromise[]>;
  /** When the page read the totals, to tell whether a total sent back by a save is newer. */
  loadedAt: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Taps sent but not answered yet, so the number moves the moment you tap.
  const [inFlight, setInFlight] = useState<Record<string, number>>({});
  // The newest total the server sent back for each item, and when.
  const [known, setKnown] = useState<Record<string, { onHand: number; at: number }>>({});
  const waiting = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState('');
  const [promiseFor, setPromiseFor] = useState<string | null>(null);

  const add = async (item: KitItem, change: number, reason: 'donation' | 'correction') => {
    setInFlight((f) => ({ ...f, [item.id]: (f[item.id] ?? 0) + change }));
    waiting.current += 1;
    if (settle.current) clearTimeout(settle.current);
    const result = await tryAction(() => changeStock(event, item.id, change, reason));
    setInFlight((f) => ({ ...f, [item.id]: (f[item.id] ?? 0) - change }));
    if (result.ok) {
      const { onHand, at } = result;
      setKnown((k) => (k[item.id] && k[item.id].at > at ? k : { ...k, [item.id]: { onHand, at } }));
      setMessage({ error: false, text: `${change > 0 ? '+' : ''}${change} ${item.name} saved.` });
    } else {
      setMessage({ error: true, text: result.message });
    }
    // Once the tapping stops, reload once so Recent changes and other volunteers' counts show.
    waiting.current -= 1;
    if (waiting.current === 0) settle.current = setTimeout(() => router.refresh(), 1500);
  };

  // Whichever is newer: the page's totals or the last total a save sent back. Then add taps
  // still on their way.
  const current = (id: string, base: number) => {
    const k = known[id];
    return (k && k.at > loadedAt ? k.onHand : base) + (inFlight[id] ?? 0);
  };

  const shown = rows.filter((r) => r.item.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <>
      <div className="filters">
        <input type="search" placeholder="Find an item…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Find an item" />
      </div>
      {message && (
        <p role="status" className={message.error ? 'error' : 'fine'}>
          {message.text}
        </p>
      )}

      <div className="inv-list">
        {shown.map(({ item, onHand: base, needed, committed }) => {
          const onHand = current(item.id, base);
          const short = needed - Math.max(onHand, 0) - committed;
          const n = Number.parseInt(custom[item.id] ?? '', 10);
          return (
            <div key={item.id} className={short > 0 ? 'inv-row short' : 'inv-row'}>
              <div className="inv-name">
                <strong>{item.name}</strong>
                <span className="fine">{item.unit}</span>
              </div>
              <div className="inv-counts">
                <span className="inv-have">{onHand}</span>
                <span className="fine">
                  on hand · <strong>{committed}</strong> committed · {needed} needed
                  <br />
                  {short > 0 ? (
                    <strong className="error-text">{short} still short</strong>
                  ) : needed > 0 ? (
                    committed > 0 && Math.max(onHand, 0) < needed ? 'Covered once donors bring what they promised' : 'Enough'
                  ) : (
                    ''
                  )}
                </span>
              </div>
              <div className="inv-buttons">
                <button type="button" className="btn primary tap" onClick={() => add(item, 1, 'donation')} aria-label={`Add 1 ${item.name}`}>
                  +1
                </button>
                <button type="button" className="btn ghost tap" onClick={() => add(item, -1, 'correction')} aria-label={`Take 1 ${item.name} off`}>
                  −1
                </button>
                <form
                  className="inv-custom"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!Number.isInteger(n) || n === 0) return;
                    add(item, n, n > 0 ? 'donation' : 'correction');
                    setCustom((c) => ({ ...c, [item.id]: '' }));
                  }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Other"
                    aria-label={`Other amount of ${item.name}`}
                    value={custom[item.id] ?? ''}
                    onChange={(e) => setCustom((c) => ({ ...c, [item.id]: e.target.value }))}
                  />
                  <button type="submit" className="btn ghost tap">
                    Add
                  </button>
                </form>
                <button type="button" className="btn ghost tap" onClick={() => setPromiseFor(promiseFor === item.id ? null : item.id)}>
                  + Promise
                </button>
              </div>
              {(promises[item.id] ?? []).length > 0 && (
                <OpenPromises
                  event={event}
                  item={item}
                  promises={promises[item.id]}
                  onMessage={(error, text) => setMessage({ error, text })}
                />
              )}
              {promiseFor === item.id && (
                <PromiseForm
                  event={event}
                  item={item}
                  slots={slots}
                  onDone={(text) => {
                    setPromiseFor(null);
                    if (text) setMessage({ error: false, text });
                  }}
                />
              )}
            </div>
          );
        })}
        {shown.length === 0 && <p className="empty">No items match. Items are set on the Meal plan page.</p>}
      </div>

      <section className="card">
        <h2>Recent changes</h2>
        {entries.length === 0 ? (
          <p className="fine">Nothing counted yet.</p>
        ) : (
          <ul className="versions">
            {entries.map((e) => (
              <li key={e.id}>
                <span>
                  <strong>
                    {e.change > 0 ? '+' : ''}
                    {e.change} {e.itemName}
                  </strong>{' '}
                  <span className="fine">
                    {REASONS[e.reason] ?? e.reason} · {e.when} · {e.who}
                  </span>
                </span>
                {e.canUndo && (
                  <button
                    type="button"
                    className="btn ghost small"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await tryAction(() => undoEntry(event, e.id));
                        setMessage(r.ok ? { error: false, text: 'Taken back.' } : { error: true, text: r.message });
                        router.refresh();
                      })
                    }
                  >
                    Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

