import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import { formPath } from '@/lib/forms/defaults';
import { listColumns, searchText } from '@/lib/forms/results';
import { openLabel } from '@/lib/forms/status';
import { getForm, getResponses } from '@/lib/forms/store';
import { requireAdmin } from '@/lib/auth';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const { q = '', status = '' } = await searchParams;
  const form = await getForm(slug);
  if (!form) notFound();
  const c = form.config;

  let rows;
  try {
    rows = await getResponses(slug);
  } catch (e) {
    console.error('results load failed', e);
    return <p className="error">Could not load responses. Check the Supabase settings and try again.</p>;
  }

  const columns = listColumns(c);
  const statuses = Array.from(new Set([...c.statuses, ...rows.map((r) => r.status)]));
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!status || r.status === status) && (!needle || searchText(r).includes(needle)));
  const open = openLabel(c);
  const exportHref = `/admin/results/${slug}/export${status ? `?status=${encodeURIComponent(status)}` : ''}`;

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{c.name}</h1>
          <p className="fine">
            <span className={`pill tone-${open.tone}`}>{open.text}</span> &middot; {rows.length} response
            {rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="title-links">
          {!c.archived && (
            <>
              <a className="textlink" href={formPath(slug)} target="_blank" rel="noopener noreferrer">
                View form ↗
              </a>
              <Link className="textlink" href={`/admin/forms/${slug}`}>
                Edit form
              </Link>
            </>
          )}
          <a className="btn ghost small" href={exportHref}>
            Download spreadsheet
          </a>
        </div>
      </div>

      <form className="filters" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Search names, sizes, anything…" aria-label="Search" />
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Every status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn ghost small" type="submit">
          Search
        </button>
        {(q || status) && (
          <Link className="textlink" href={`/admin/results/${slug}`}>
            Clear
          </Link>
        )}
      </form>

      <AutoRefresh />

      <div className="tablewrap">
        {shown.length === 0 ? (
          <p className="empty">{rows.length === 0 ? 'No responses yet.' : 'Nothing matches that search.'}</p>
        ) : (
          <table className="results">
            <thead>
              <tr>
                <th>Received</th>
                {columns.map((col, i) => (
                  <th key={i}>{col.label}</th>
                ))}
                <th>Status</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const href = `/admin/results/${slug}/${r.id}`;
                const fresh = r.status === c.statuses[0];
                return (
                  <tr key={r.id} className={fresh ? 'fresh' : undefined}>
                    <td className="nowrap">
                      <Link href={href}>{dateFmt.format(new Date(r.created_at))}</Link>
                      {r.language === 'es' && <span className="tag">Spanish</span>}
                    </td>
                    {columns.map((col, i) => (
                      <td key={i} className="long">
                        {col.value(r.answers ?? {})}
                      </td>
                    ))}
                    <td>
                      <span className={fresh ? 'pill tone-open' : 'pill'}>{r.status}</span>
                    </td>
                    <td>
                      <Link className="btn ghost small" href={href}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
