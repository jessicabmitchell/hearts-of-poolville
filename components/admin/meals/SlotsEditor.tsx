'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteSlot, saveSlot, type SlotInput } from '@/app/admin/meals/actions';
import type { Slot } from '@/lib/meals/dropoff';
import { tryAction } from './tryAction';

function SlotRow({ event, slot, signedUp }: { event: string; slot: Slot | null; signedUp: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const blank: SlotInput = { day: '', start_time: '10:00', end_time: '12:00', place: '', capacity: null };
  const [v, setV] = useState<SlotInput>(slot ? { ...slot } : blank);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changed = !slot || JSON.stringify({ ...slot, ...v }) !== JSON.stringify(slot);

  const save = () =>
    start(async () => {
      const r = await tryAction(() => saveSlot(event, v));
      if (r.ok) {
        setMessage({ error: false, text: 'Saved.' });
        if (!slot) setV(blank);
        router.refresh();
      } else setMessage({ error: true, text: r.message });
    });

  return (
    <div className={slot ? 'slot-row' : 'slot-row new'}>
      <label className="field">
        <span className="bi-label">Date</span>
        <input type="date" value={v.day} onChange={(e) => setV({ ...v, day: e.target.value })} />
      </label>
      <label className="field">
        <span className="bi-label">From</span>
        <input type="time" value={v.start_time} onChange={(e) => setV({ ...v, start_time: e.target.value })} />
      </label>
      <label className="field">
        <span className="bi-label">To</span>
        <input type="time" value={v.end_time} onChange={(e) => setV({ ...v, end_time: e.target.value })} />
      </label>
      <label className="field slot-place">
        <span className="bi-label">Place</span>
        <input value={v.place} placeholder="Where to bring it" onChange={(e) => setV({ ...v, place: e.target.value })} />
      </label>
      <label className="field">
        <span className="bi-label">Most donors</span>
        <input
          type="number"
          min={1}
          placeholder="No limit"
          value={v.capacity ?? ''}
          onChange={(e) => setV({ ...v, capacity: e.target.value ? Number.parseInt(e.target.value, 10) || null : null })}
        />
      </label>
      <div className="slot-tools">
        <button type="button" className="btn primary small" disabled={pending || !changed} onClick={save}>
          {slot ? 'Save' : '+ Add time'}
        </button>
        {slot &&
          (confirmDelete ? (
            <>
              <button
                type="button"
                className="btn danger small"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await tryAction(() => deleteSlot(event, slot.id));
                    setConfirmDelete(false);
                    if (!r.ok) setMessage({ error: true, text: r.message });
                    router.refresh();
                  })
                }
              >
                Yes, delete
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          ))}
        {slot && <span className="fine">{signedUp} signed up</span>}
      </div>
      {message && <p className={message.error ? 'error slot-msg' : 'fine slot-msg'}>{message.text}</p>}
    </div>
  );
}

export default function SlotsEditor({ event, slots, signedUp }: { event: string; slots: Slot[]; signedUp: Record<string, number> }) {
  return (
    <div className="slots">
      {slots.map((s) => (
        <SlotRow key={`${s.id}-${s.day}-${s.start_time}-${s.end_time}-${s.place}-${s.capacity}`} event={event} slot={s} signedUp={signedUp[s.id] ?? 0} />
      ))}
      <SlotRow event={event} slot={null} signedUp={0} />
    </div>
  );
}
