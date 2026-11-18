'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { matchTags, removeMatch, type AngelResult } from '@/app/admin/angels/actions';
import type { Angel, TagForm } from '@/lib/angels/store';
import { tryAction } from '../meals/tryAction';

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const digits = (s: string) => s.replace(/\D/g, '');
const contact = (t: TagForm) => [t.phone, t.email].filter(Boolean).join(' · ');

function TagRow({ tag, onMatched }: { tag: TagForm; onMatched: (id: string) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ids, setIds] = useState('');
  const [message, setMessage] = useState<AngelResult | null>(null);

  const save = () =>
    start(async () => {
      const r = await tryAction(() => matchTags(tag.id, ids));
      setMessage(r);
      if (r.ok) {
        setIds('');
        onMatched(tag.id);
        router.refresh();
      }
    });

  return (
    <li className="tag-row">
      <div>
        <p className="pickup-name">
          <strong>{tag.name || 'No name'}</strong> <span className="fine">{when.format(new Date(tag.createdAt))}</span>
        </p>
        {contact(tag) && <p className="fine">{contact(tag)}</p>}
        <p>
          <span className="fine">They wrote:</span> {tag.text || <em>nothing</em>}
        </p>
        {tag.codes.length > 0 && (
          <p className="fine">
            Matched: <strong>{tag.codes.join(', ')}</strong>
          </p>
        )}
      </div>
      <form
        className="tag-match"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          placeholder="A12, A15"
          aria-label={`Angel IDs for ${tag.name || 'this tag form'}`}
        />
        <button type="submit" className="btn primary small" disabled={pending || !ids.trim()}>
          {pending ? 'Saving…' : 'Match'}
        </button>
      </form>
      {message && <p className={message.ok ? 'fine tag-msg' : 'error tag-msg'}>{message.message}</p>}
    </li>
  );
}

function AngelRow({ angel }: { angel: Angel }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const t = angel.tag;

  return (
    <tr>
      <td className="nowrap">
        <strong>{angel.code}</strong>
      </td>
      <td>{angel.child}</td>
      <td>{angel.age}</td>
      <td>{angel.gender}</td>
      <td>
        <Link className="textlink" href={`/admin/results/angel_tree/${angel.responseId}`}>
          {angel.family || 'Open sign-up'}
        </Link>
      </td>
      <td className="long">
        {t ? (
          <>
            <span className="pill tone-open">Taken</span> {t.name}
            {contact(t) && <span className="fine"> · {contact(t)}</span>}
          </>
        ) : (
          <span className="pill">Not taken</span>
        )}
        {error && <p className="error">{error}</p>}
      </td>
      <td className="nowrap">
        {t &&
          (confirm ? (
            <span className="tools">
              <button
                type="button"
                className="btn danger small"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await tryAction(() => removeMatch(angel.number));
                    setConfirm(false);
                    setError(r.ok ? '' : r.message);
                    router.refresh();
                  })
                }
              >
                Yes, remove
              </button>
              <button type="button" className="btn ghost small" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirm(true)}>
              Remove match
            </button>
          ))}
      </td>
    </tr>
  );
}

export default function AngelBoard({ angels, tagForms }: { angels: Angel[]; tagForms: TagForm[] }) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'all' | 'open' | 'taken'>('all');
  const [allTags, setAllTags] = useState(false);
  // Tag forms matched on this visit stay in view, so the volunteer sees what happened.
  const [justMatched, setJustMatched] = useState<Set<string>>(new Set());

  const tagsShown = tagForms.filter((t) => allTags || t.codes.length === 0 || justMatched.has(t.id));
  const needle = search.trim().toLowerCase();
  const needleDigits = digits(needle);
  const shown = angels.filter(
    (a) =>
      (show === 'all' || (show === 'taken') === Boolean(a.tag)) &&
      (!needle ||
        `${a.code} ${a.child} ${a.family} ${a.tag?.name ?? ''}`.toLowerCase().includes(needle) ||
        (needleDigits.length > 0 && (a.number === Number(needleDigits) || digits(a.tag?.phone ?? '').includes(needleDigits)))),
  );

  return (
    <>
      <section className="card">
        <h2>Tag forms to match</h2>
        <p className="fine">
          Tag forms show up here when we could not tell which angel they meant. Type the angel IDs from the tag, then
          press Match.
        </p>
        {tagsShown.length === 0 ? (
          <p className="fine">{tagForms.length === 0 ? 'No tag forms yet.' : 'All tag forms are matched.'}</p>
        ) : (
          <ul className="pickup-list">
            {tagsShown.map((t) => (
              <TagRow key={t.id} tag={t} onMatched={(id) => setJustMatched((s) => new Set(s).add(id))} />
            ))}
          </ul>
        )}
        {tagForms.some((t) => t.codes.length > 0) && (
          <label className="show-all">
            <input type="checkbox" checked={allTags} onChange={(e) => setAllTags(e.target.checked)} /> Show matched tag
            forms too, to add another angel to one
          </label>
        )}
      </section>

      <h2 className="editor-h">All angels</h2>
      <div className="filters">
        <input type="search" placeholder="ID, child, family, or who took the tag…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Find an angel" />
        <select value={show} onChange={(e) => setShow(e.target.value as typeof show)} aria-label="Which angels to show">
          <option value="all">Every angel</option>
          <option value="open">Tag not taken yet</option>
          <option value="taken">Tag taken</option>
        </select>
      </div>
      <div className="tablewrap">
        {shown.length === 0 ? (
          <p className="empty">{angels.length === 0 ? 'No one has signed up for the Angel Tree yet.' : 'No angels match.'}</p>
        ) : (
          <table className="results">
            <thead>
              <tr>
                <th>ID</th>
                <th>Angel</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Family</th>
                <th>Tag</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <AngelRow key={`${a.number}-${a.tag?.id ?? ''}`} angel={a} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
