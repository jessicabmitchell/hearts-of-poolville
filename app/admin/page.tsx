import type { Metadata } from 'next';
import Link from 'next/link';
import AutoRefresh from '@/components/AutoRefresh';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROGRAMS, programName } from '@/lib/programs';
import {
  REQUEST_STATUSES,
  TAG_STATUSES,
  type HelpRequest,
  type TagPickup,
  type DinnerApplication,
  type AngelTreeApplication,
} from '@/lib/types';
import { signOut, updateStatus } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const label = (s: string) => s.replace('_', ' ');

function StatusForm({
  table,
  id,
  status,
  options,
}: {
  table: 'help_requests' | 'tag_pickups' | 'dinner_applications' | 'angel_tree_applications';
  id: string;
  status: string;
  options: readonly string[];
}) {
  return (
    <form action={updateStatus} className="statusform">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} aria-label="Status">
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </select>
      <button className="btn ghost small" type="submit">
        Save
      </button>
    </form>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; program?: string }>;
}) {
  const user = await requireAdmin();
  const { view: viewParam, program = '' } = await searchParams;
  const view =
    viewParam === 'tags' || viewParam === 'angels' || viewParam === 'thanksgiving' || viewParam === 'christmas'
      ? viewParam
      : 'requests';
  const csvHref = {
    requests: '/admin/export?table=help_requests',
    tags: '/admin/export?table=tag_pickups',
    angels: '/admin/export?table=angel_tree_applications',
    thanksgiving: '/admin/export?table=dinner_applications&holiday=thanksgiving',
    christmas: '/admin/export?table=dinner_applications&holiday=christmas',
  }[view];

  const db = createAdminClient();
  const [reqRes, tagRes, tgRes, angelRes] = await Promise.all([
    db.from('help_requests').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('tag_pickups').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('dinner_applications').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('angel_tree_applications').select('*').order('created_at', { ascending: false }).limit(2000),
  ]);

  const loadError = reqRes.error ?? tagRes.error ?? tgRes.error ?? angelRes.error;
  if (loadError) {
    console.error('admin load failed', loadError);
    return (
      <main className="admin">
        <p className="error">Could not load submissions. Check the Supabase settings and try again.</p>
      </main>
    );
  }

  const requests = (reqRes.data ?? []) as HelpRequest[];
  const tags = (tagRes.data ?? []) as TagPickup[];
  const allDinners = (tgRes.data ?? []) as DinnerApplication[];
  const dinnersFor = (h: string) => allDinners.filter((d) => d.holiday === h);
  const dinners = dinnersFor(view);
  const angels = (angelRes.data ?? []) as AngelTreeApplication[];
  const shown = program ? requests.filter((r) => r.programs.includes(program)) : requests;
  const newCount = requests.filter((r) => r.status === 'new').length;

  return (
    <main className="admin">
      <div className="admin-head">
        <div>
          <h1>Admin</h1>
          <p className="fine">Signed in as {user.email}</p>
          <AutoRefresh />
        </div>
        <form action={signOut}>
          <button className="btn ghost small" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div className="chips" role="navigation" aria-label="View">
        <Link className="chip" href="/admin" aria-current={view === 'requests' ? 'page' : undefined}>
          Help requests ({requests.length}, {newCount} new)
        </Link>
        <Link className="chip" href="/admin?view=angels" aria-current={view === 'angels' ? 'page' : undefined}>
          Angel Tree children ({angels.length}, {angels.filter((a) => a.status === 'new').length} new)
        </Link>
        <Link className="chip" href="/admin?view=tags" aria-current={view === 'tags' ? 'page' : undefined}>
          Angel Tree tags ({tags.length})
        </Link>
        {(['thanksgiving', 'christmas'] as const).map((h) => (
          <Link key={h} className="chip" href={`/admin?view=${h}`} aria-current={view === h ? 'page' : undefined}>
            {programName(h)} ({dinnersFor(h).length}, {dinnersFor(h).filter((d) => d.status === 'new').length} new)
          </Link>
        ))}
        <a className="chip" href={csvHref}>
          Download CSV
        </a>
      </div>

      {view === 'requests' ? (
        <>
          <div className="chips" role="navigation" aria-label="Filter by program">
            <Link className="chip" href="/admin" aria-current={program ? undefined : 'page'}>
              All programs
            </Link>
            {PROGRAMS.map((p) => (
              <Link
                key={p.id}
                className="chip"
                href={`/admin?program=${p.id}`}
                aria-current={program === p.id ? 'page' : undefined}
              >
                {p.name} ({requests.filter((r) => r.programs.includes(p.id)).length})
              </Link>
            ))}
          </div>
          <div className="tablewrap">
            {shown.length === 0 ? (
              <p className="empty">No requests yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Name</th>
                    <th>Programs</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Household</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{dateFmt.format(new Date(r.created_at))}</td>
                      <td>{r.name}</td>
                      <td>{r.programs.map(programName).join(', ')}</td>
                      <td className="long">{[r.phone, r.email].filter(Boolean).join('\n')}</td>
                      <td className="long">{r.address}</td>
                      <td>{r.household_size}</td>
                      <td className="long">{r.details}</td>
                      <td>
                        <StatusForm table="help_requests" id={r.id} status={r.status} options={REQUEST_STATUSES} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : view === 'thanksgiving' || view === 'christmas' ? (
        <div className="tablewrap">
          {dinners.length === 0 ? (
            <p className="empty">No {programName(view).toLowerCase()} applications yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>For</th>
                  <th>Family</th>
                  <th>Size</th>
                  <th>Address</th>
                  <th>Family contact</th>
                  <th>Filled out by</th>
                  <th>Pickup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dinners.map((d) => {
                  const filler = [d.name, d.phone, d.email].filter(Boolean).join('\n');
                  return (
                    <tr key={d.id}>
                      <td className="nowrap">
                        {dateFmt.format(new Date(d.created_at))}
                        {d.language === 'es' && (
                          <>
                            {' '}
                            <span className="open">Spanish</span>
                          </>
                        )}
                      </td>
                      <td>{d.for_self ? 'Own family' : 'Another family'}</td>
                      <td>{d.for_self ? d.name : d.recipient_name}</td>
                      <td>{d.household_size}</td>
                      <td className="long">{d.address}</td>
                      <td className="long">
                        {d.for_self
                          ? [d.phone, d.email].filter(Boolean).join('\n')
                          : [d.recipient_phone, d.recipient_email].filter(Boolean).join('\n')}
                      </td>
                      <td className="long">{d.for_self ? 'Same' : filler}</td>
                      <td>{d.pickup_by ?? (d.for_self ? 'Same' : d.name)}</td>
                      <td>
                        <StatusForm
                          table="dinner_applications"
                          id={d.id}
                          status={d.status}
                          options={REQUEST_STATUSES}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : view === 'angels' ? (
        <div className="tablewrap">
          {angels.length === 0 ? (
            <p className="empty">No Angel Tree applications yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Child</th>
                  <th>Sizes</th>
                  <th>Likes &amp; wishes</th>
                  <th>Parent / guardian</th>
                  <th>Address</th>
                  <th>Filled out by</th>
                  <th>Pickup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {angels.map((a) => {
                  const lines = (pairs: [string, string | null][]) =>
                    pairs
                      .filter(([, value]) => value)
                      .map(([k, value]) => `${k}: ${value}`)
                      .join('\n');
                  const filler = [a.name, a.phone, a.email].filter(Boolean).join('\n');
                  return (
                    <tr key={a.id}>
                      <td className="nowrap">
                        {dateFmt.format(new Date(a.created_at))}
                        {a.language === 'es' && (
                          <>
                            {' '}
                            <span className="open">Spanish</span>
                          </>
                        )}
                      </td>
                      <td className="nowrap">
                        <strong>{a.child_name}</strong>
                        <br />
                        {[a.age, a.gender].filter(Boolean).join(', ')}
                      </td>
                      <td className="long">
                        {lines([
                          ['Shirt', a.shirt_size],
                          ['Jeans', a.jeans_size],
                          ['Shoe', a.shoe_size],
                          ['Coat', a.coat_size],
                          ['Bed', a.bedding_size],
                        ])}
                      </td>
                      <td className="long">
                        {lines([
                          ['Likes', a.interests],
                          ['Color', a.favorite_color],
                          ['Wishes', a.wishes],
                        ])}
                      </td>
                      <td className="long">
                        {a.for_self ? filler : [a.parent_name, a.parent_phone, a.parent_email].filter(Boolean).join('\n')}
                      </td>
                      <td className="long">{a.address}</td>
                      <td className="long">{a.for_self ? 'Parent' : filler}</td>
                      <td>{a.pickup_by ?? (a.for_self ? 'Parent' : a.name)}</td>
                      <td>
                        <StatusForm
                          table="angel_tree_applications"
                          id={a.id}
                          status={a.status}
                          options={REQUEST_STATUSES}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="tablewrap">
          {tags.length === 0 ? (
            <p className="empty">No tags recorded yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Tag(s)</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap">{dateFmt.format(new Date(t.created_at))}</td>
                    <td className="long">{t.tag_numbers}</td>
                    <td>{t.name}</td>
                    <td className="long">{[t.phone, t.email].filter(Boolean).join('\n')}</td>
                    <td className="long">{t.notes}</td>
                    <td>
                      <StatusForm table="tag_pickups" id={t.id} status={t.status} options={TAG_STATUSES} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
