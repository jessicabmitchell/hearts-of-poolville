import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PROGRAMS, programName } from '@/lib/programs';
import { REQUEST_STATUSES, TAG_STATUSES, type HelpRequest, type TagPickup } from '@/lib/types';
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
  table: 'help_requests' | 'tag_pickups';
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
  const view = viewParam === 'tags' ? 'tags' : 'requests';

  const db = createAdminClient();
  const [reqRes, tagRes] = await Promise.all([
    db.from('help_requests').select('*').order('created_at', { ascending: false }).limit(2000),
    db.from('tag_pickups').select('*').order('created_at', { ascending: false }).limit(2000),
  ]);

  if (reqRes.error || tagRes.error) {
    console.error('admin load failed', reqRes.error ?? tagRes.error);
    return (
      <main className="admin">
        <p className="error">Could not load submissions. Check the Supabase settings and try again.</p>
      </main>
    );
  }

  const requests = (reqRes.data ?? []) as HelpRequest[];
  const tags = (tagRes.data ?? []) as TagPickup[];
  const shown = program ? requests.filter((r) => r.programs.includes(program)) : requests;
  const newCount = requests.filter((r) => r.status === 'new').length;

  return (
    <main className="admin">
      <div className="admin-head">
        <div>
          <h1>Admin</h1>
          <p className="fine">Signed in as {user.email}</p>
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
        <Link className="chip" href="/admin?view=tags" aria-current={view === 'tags' ? 'page' : undefined}>
          Angel Tree tags ({tags.length})
        </Link>
        <a className="chip" href={`/admin/export?table=${view === 'tags' ? 'tag_pickups' : 'help_requests'}`}>
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
