import Link from 'next/link';
import AutoRefresh from '@/components/AutoRefresh';
import { formPath } from '@/lib/forms/defaults';
import { openLabel } from '@/lib/forms/status';
import { getAllForms, getCounts, getFilledForLimited } from '@/lib/forms/store';
import { requireAdmin } from '@/lib/auth';

export default async function AdminOverview() {
  await requireAdmin();
  const forms = (await getAllForms()).filter((f) => !f.config.archived);
  const [counts, filled] = await Promise.all([getCounts(forms), getFilledForLimited(forms)]);

  return (
    <>
      <div className="admin-title">
        <h1>Overview</h1>
        <AutoRefresh />
      </div>
      <div className="cards">
        {forms.map((f) => {
          const status = openLabel(f.config, filled[f.slug]);
          const n = counts[f.slug] ?? { total: 0, fresh: 0 };
          return (
            <div key={f.slug} className="card">
              <div className="card-top">
                <h2>{f.config.name}</h2>
                <span className={`pill tone-${status.tone}`}>{status.text}</span>
              </div>
              <p className="card-count">
                <strong>{n.fresh}</strong> {f.config.statuses[0].toLowerCase()} &middot; {n.total} total
              </p>
              <div className="card-links">
                <Link className="btn primary small" href={`/admin/results/${f.slug}`}>
                  See responses
                </Link>
                <Link className="btn ghost small" href={`/admin/forms/${f.slug}`}>
                  Edit form
                </Link>
                <a className="textlink" href={formPath(f.slug)} target="_blank" rel="noopener noreferrer">
                  View form ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
