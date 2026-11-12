'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { changeStock, undoEntry } from '@/app/admin/meals/actions';
import { tryAction } from './tryAction';
import type { KitItem } from '@/lib/meals/logic';

type Row = { item: KitItem; onHand: number; needed: number };
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
}: {
  event: string;
  rows: Row[];
  entries: EntryView[];
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
        {shown.map(({ item, onHand: base, needed }) => {
          const onHand = current(item.id, base);
          const short = needed - Math.max(onHand, 0);
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
                  on hand · {needed} needed
                  <br />
                  {short > 0 ? <strong className="error-text">{short} short</strong> : needed > 0 ? 'Enough' : ''}
                </span>
              </div>
              <div className="inv-buttons">
                {[1, 5, 10].map((k) => (
                  <button key={k} type="button" className="btn primary tap" onClick={() => add(item, k, 'donation')}>
                    +{k}
                  </button>
                ))}
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
              </div>
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

