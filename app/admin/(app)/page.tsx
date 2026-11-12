import Link from 'next/link';
import AutoRefresh from '@/components/AutoRefresh';
import { formPath } from '@/lib/forms/defaults';
import { openLabel } from '@/lib/forms/status';
import { getAllForms, getCounts, getFilledForLimited } from '@/lib/forms/store';
import { requireAdmin } from '@/lib/auth';
import { EVENTS, type MealEvent } from '@/lib/meals/logic';
import { getFamilies } from '@/lib/meals/store';

export default async function AdminOverview() {
  await requireAdmin();
  const forms = (await getAllForms()).filter((f) => !f.config.archived);
  const [counts, filled] = await Promise.all([getCounts(forms), getFilledForLimited(forms)]);

  // Holiday meals with registrations, for the summary at the top. Skipped if the meal tables
  // have not been set up yet.
  const mealEvents = (Object.keys(EVENTS) as MealEvent[]).filter((e) => (counts[e]?.total ?? 0) > 0);
  const meals = await Promise.all(
    mealEvents.map(async (event) => {
      const families = await getFamilies(event).catch(() => null);
      if (!families) return null;
      return {
        event,
        families: families.length,
        people: families.reduce((n, f) => n + (f.size ?? 0), 0),
        packed: families.filter((f) => f.kit.packed_at).length,
        pickedUp: families.filter((f) => f.kit.picked_up_at).length,
      };
    }),
  );

  return (
    <>
      <div className="admin-title">
        <h1>Overview</h1>
        <AutoRefresh />
      </div>
      {meals.map(
        (m) =>
          m && (
            <Link key={m.event} className="meal-strip" href={`/admin/meals/${m.event}`}>
              <strong>{EVENTS[m.event].name} meals</strong>
              <span>
                <b>{m.families}</b> families
              </span>
              <span>
                <b>{m.people}</b> people
              </span>
              <span>
                <b>{m.packed}</b> packed
              </span>
              <span>
                <b>{m.pickedUp}</b> picked up
              </span>
              <span className="textlink">Open →</span>
            </Link>
          ),
      )}

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
