import { createForm } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';

export default async function NewFormPage({ searchParams }: { searchParams: Promise<{ missing?: string; failed?: string }> }) {
  await requireAdmin();
  const { missing, failed } = await searchParams;
  return (
    <>
      <div className="admin-title">
        <h1>New form</h1>
      </div>
      <section className="card">
        <form action={createForm} className="form">
          <div className="field">
            <label htmlFor="name">What should the form be called?</label>
            <input id="name" name="name" type="text" placeholder="For example: Easter basket request" required />
            <span className="hint">
              It starts with name, phone, and email questions and stays turned off until you turn it on.
            </span>
          </div>
          {(missing || failed) && (
            <p className="error" role="alert">
              {missing ? 'Please type a name for the form.' : 'Creating the form did not work. Please try again.'}
            </p>
          )}
          <div>
            <button className="btn primary" type="submit">
              Create form
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
