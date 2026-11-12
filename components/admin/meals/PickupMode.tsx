'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setPickup } from '@/app/admin/meals/actions';
import { tryAction } from './tryAction';
import type { Family } from '@/lib/meals/logic';

const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const digits = (s: string) => s.replace(/\D/g, '');

function FamilyRow({ event, f }: { event: string; f: Family }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<'override' | 'undo' | null>(null);
  const [error, setError] = useState('');
  const packed = Boolean(f.kit.packed_at);
  const picked = Boolean(f.kit.picked_up_at);

  const run = (how: 'pickup' | 'override' | 'undo') =>
    start(async () => {
      const r = await tryAction(() => setPickup(event, f.id, how));
      setConfirm(null);
      setError(r.ok ? '' : r.message);
      router.refresh();
    });

  return (
    <li className={picked ? 'pickup-row picked' : 'pickup-row'}>
      <div className="pickup-info">
        <p className="pickup-name">
          <strong>{f.name}</strong> <span className="pickup-code">{f.code}</span>
        </p>
        <p className="fine">
          {f.size ? `${f.size} people` : 'Size unknown'}
          {f.pickupBy && f.pickupBy !== f.name ? ` · Picking up: ${f.pickupBy}` : ''}
          {f.phone ? ` · ${f.phone}` : ''}
        </p>
        <p className="fine">
          {picked ? (
            <span className="pill tone-open">
              Picked up {time.format(new Date(f.kit.picked_up_at!))}
              {f.kit.pickup_override ? ' (before packing)' : ''}
            </span>
          ) : packed ? (
            <span className="pill tone-soon">Packed · waiting</span>
          ) : (
            <span className="pill">Not packed yet</span>
          )}
        </p>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="pickup-actions">
        {!picked && packed && (
          <button type="button" className="btn primary big" disabled={pending} onClick={() => run('pickup')}>
            {pending ? 'Saving…' : 'Mark picked up'}
          </button>
        )}
        {!picked && !packed &&
          (confirm === 'override' ? (
            <span className="tools">
              <button type="button" className="btn danger small" disabled={pending} onClick={() => run('override')}>
                Yes, hand it over unpacked
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirm('override')}>
              Picked up anyway…
            </button>
          ))}
        {picked &&
          (confirm === 'undo' ? (
            <span className="tools">
              <button type="button" className="btn danger small" disabled={pending} onClick={() => run('undo')}>
                Yes, undo pickup
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirm('undo')}>
              Undo
            </button>
          ))}
      </div>
    </li>
  );
}

export default function PickupMode({ event, families }: { event: string; families: Family[] }) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'waiting' | 'all' | 'picked'>('waiting');
  const picked = families.filter((f) => f.kit.picked_up_at).length;

  const needle = search.trim().toLowerCase();
  const needleDigits = digits(needle);
  const list = families.filter((f) => {
    if (show === 'waiting' && f.kit.picked_up_at) return false;
    if (show === 'picked' && !f.kit.picked_up_at) return false;
    if (!needle) return true;
    if (`${f.code} ${f.name} ${f.pickupBy} ${f.filledBy}`.toLowerCase().includes(needle)) return true;
    // Codes can be typed as just the number: "7" finds TG-007.
    if (needleDigits && (digits(f.phone).includes(needleDigits) || f.number === Number(needleDigits))) return true;
    return false;
  });

  return (
    <>
      <p className="progress-line">
        <strong>{picked}</strong> of {families.length} meals picked up
      </p>
      <div className="filters">
        <input
          type="search"
          placeholder="Name, phone, or pickup code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Find a family"
          autoFocus
        />
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} aria-label="Which families to show">
          <option value="waiting">Not picked up yet</option>
          <option value="picked">Picked up</option>
          <option value="all">Everyone</option>
        </select>
      </div>
      {list.length === 0 ? (
        <p className="empty">{families.length === 0 ? 'No families have registered yet.' : 'No one matches that search.'}</p>
      ) : (
        <ul className="pickup-list">
          {list.map((f) => (
            <FamilyRow key={f.id} event={event} f={f} />
          ))}
        </ul>
      )}
    </>
  );
}
