'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { saveMealPlan } from '@/app/admin/meals/actions';
import { tryAction } from './tryAction';
import type { KitItem, MealPlan } from '@/lib/meals/logic';

function move<X>(list: X[], i: number, by: -1 | 1): X[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const num = (v: string) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function PlanEditor({ event, initial, neverSaved }: { event: string; initial: MealPlan; neverSaved: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [saved, setSaved] = useState(neverSaved ? null : initial);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dirty = saved === null || JSON.stringify(plan) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty || saved === null) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saved]);

  const set = (next: MealPlan) => {
    setPlan(next);
    setMessage(null);
  };
  const setItem = (i: number, item: KitItem) => set({ ...plan, items: plan.items.map((x, j) => (j === i ? item : x)) });

  const save = () =>
    start(async () => {
      const r = await tryAction(() => saveMealPlan(event, plan));
      if (r.ok) {
        setSaved(plan);
        setMessage({ error: false, text: 'Saved. Packing checklists now use these amounts.' });
        router.refresh();
      } else setMessage({ error: true, text: r.message });
    });

  return (
    <div className="editor">
      {neverSaved && saved === null && (
        <p className="notice">
          These are starting amounts. Small is the kit from the planning notes; Medium and Large are guesses. Check them,
          then click Save.
        </p>
      )}

      <section className="card">
        <h2>Kit sizes</h2>
        <p className="fine">Each family gets the kit size that matches their household size.</p>
        <div className="tier-grid">
          {plan.tiers.map((t, i) => (
            <div key={t.id} className="tier">
              <label className="field">
                <span className="bi-label">Name</span>
                <input value={t.name} onChange={(e) => set({ ...plan, tiers: plan.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              </label>
              <div className="tier-range">
                <label className="field">
                  <span className="bi-label">From</span>
                  <input
                    type="number"
                    min={1}
                    value={t.min}
                    onChange={(e) => set({ ...plan, tiers: plan.tiers.map((x, j) => (j === i ? { ...x, min: num(e.target.value) || 1 } : x)) })}
                  />
                </label>
                <label className="field">
                  <span className="bi-label">To</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="or more"
                    value={t.max ?? ''}
                    onChange={(e) =>
                      set({ ...plan, tiers: plan.tiers.map((x, j) => (j === i ? { ...x, max: e.target.value ? num(e.target.value) || null : null } : x)) })
                    }
                  />
                </label>
              </div>
              <span className="hint">
                {t.min}
                {t.max ? `–${t.max}` : ' or more'} people
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>What goes in each kit</h2>
        <div className="tablewrap">
          <table className="plan-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                {plan.tiers.map((t) => (
                  <th key={t.id}>{t.name}</th>
                ))}
                <th>
                  <span className="sr-only">Move or delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item, i) => (
                <tr key={item.id}>
                  <td>
                    <input aria-label="Item name" value={item.name} onChange={(e) => setItem(i, { ...item, name: e.target.value })} />
                  </td>
                  <td>
                    <input aria-label={`Unit for ${item.name}`} value={item.unit} placeholder="cans" onChange={(e) => setItem(i, { ...item, unit: e.target.value })} />
                  </td>
                  {plan.tiers.map((t) => (
                    <td key={t.id}>
                      <input
                        className="qty"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`${item.name} in a ${t.name} kit`}
                        value={item.qty[t.id] ?? 0}
                        onChange={(e) => setItem(i, { ...item, qty: { ...item.qty, [t.id]: num(e.target.value) } })}
                      />
                    </td>
                  ))}
                  <td>
                    <div className="tools">
                      <button type="button" className="btn ghost small" disabled={i === 0} onClick={() => set({ ...plan, items: move(plan.items, i, -1) })} aria-label={`Move ${item.name} up`}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={i === plan.items.length - 1}
                        onClick={() => set({ ...plan, items: move(plan.items, i, 1) })}
                        aria-label={`Move ${item.name} down`}
                      >
                        ↓
                      </button>
                      {confirmDelete === item.id ? (
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => {
                            set({ ...plan, items: plan.items.filter((x) => x.id !== item.id) });
                            setConfirmDelete(null);
                          }}
                        >
                          Yes, delete
                        </button>
                      ) : (
                        <button type="button" className="btn ghost small" onClick={() => setConfirmDelete(item.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <button
            type="button"
            className="btn ghost small"
            onClick={() =>
              set({
                ...plan,
                items: [
                  ...plan.items,
                  { id: `item_${Date.now().toString(36)}`, name: '', unit: '', qty: Object.fromEntries(plan.tiers.map((t) => [t.id, 0])) },
                ],
              })
            }
          >
            + Add item
          </button>
        </div>
        <p className="fine">Meals already packed keep the amounts they were packed with.</p>
      </section>

      <div className={dirty || message ? 'savebar show' : 'savebar'}>
        <span role="status" className={message?.error ? 'savebar-msg error-text' : 'savebar-msg'}>
          {message?.text ?? (saved === null ? 'The starting amounts are not saved yet.' : dirty ? 'You have changes that are not saved.' : '')}
        </span>
        <div className="savebar-buttons">
          {dirty && saved && (
            <button type="button" className="btn ghost small" onClick={() => set(saved)}>
              Undo changes
            </button>
          )}
          <button type="button" className="btn primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
