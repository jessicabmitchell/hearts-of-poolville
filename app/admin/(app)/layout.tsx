import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/auth';
import { openLabel } from '@/lib/forms/status';
import { getAllForms, getCounts, getFilledForLimited } from '@/lib/forms/store';
import { signOut } from '@/app/admin/actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const forms = await getAllForms();
  const [counts, filled] = await Promise.all([getCounts(forms), getFilledForLimited(forms)]);

  // Old forms only show up when they still have responses to look at.
  const results = forms
    .filter((f) => !f.config.archived || counts[f.slug]?.total)
    .map((f) => ({ href: `/admin/results/${f.slug}`, label: f.config.name, badge: counts[f.slug]?.fresh }));
  const edit = forms
    .filter((f) => !f.config.archived)
    .map((f) => ({ href: `/admin/forms/${f.slug}`, label: f.config.name, note: openLabel(f.config, filled[f.slug]).text }));

  return (
    <div className="admin-shell">
      <AdminNav
        results={results}
        edit={edit}
        footer={
          <form action={signOut}>
            <p className="fine">Signed in as {user.email}</p>
            <button className="btn ghost small" type="submit">
              Sign out
            </button>
          </form>
        }
      />
      <div className="admin-main">{children}</div>
    </div>
  );
}
