import Link from 'next/link';
import { notFound } from 'next/navigation';
import { answerText, otherName } from '@/lib/forms/logic';
import { getForm, getResponse } from '@/lib/forms/store';
import type { Answer, Question } from '@/lib/forms/types';
import { deleteResponse, updateStatus } from '@/app/admin/actions';
import { requireAdmin } from '@/lib/auth';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  dateStyle: 'full',
  timeStyle: 'short',
});

function Answers({ questions, values }: { questions: Question[]; values: Record<string, unknown> }) {
  const shown = questions.filter((q) => {
    const v = values[q.id];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  if (shown.length === 0) return <p className="fine">No answers in this part.</p>;
  return (
    <dl className="answers">
      {shown.map((q) => (
        <div key={q.id}>
          <dt>{q.label.en}</dt>
          <dd>{answerText(q, values[q.id], values[otherName(q.id)])}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ResponsePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  await requireAdmin();
  const { slug, id } = await params;
  const [form, response] = await Promise.all([getForm(slug), getResponse(id)]);
  if (!form || !response || response.form_slug !== slug) notFound();
  const c = form.config;
  const a = response.answers ?? {};
  const statuses = Array.from(new Set([...c.statuses, response.status]));

  // Answers to questions that have since been removed from the form.
  const known = new Set(c.sections.flatMap((s) => [s.id, ...s.questions.flatMap((q) => [q.id, otherName(q.id)])]));
  const leftover = Object.entries(a).filter(([k, v]) => !known.has(k) && v !== '' && !(Array.isArray(v) && !v.length));

  return (
    <>
      <p>
        <Link className="textlink" href={`/admin/results/${slug}`}>
          ← All {c.name} responses
        </Link>
      </p>
      <div className="admin-title">
        <div>
          <h1>Response</h1>
          <p className="fine">
            Received {dateFmt.format(new Date(response.created_at))}
            {response.language === 'es' && <span className="tag">Filled out in Spanish</span>}
          </p>
        </div>
        <form action={updateStatus} className="statusform">
          <input type="hidden" name="id" value={response.id} />
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={response.status}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn primary small" type="submit">
            Save status
          </button>
        </form>
      </div>

      {c.sections.map((s) => {
        if (s.repeat) {
          const list = Array.isArray(a[s.id]) ? (a[s.id] as Record<string, Answer>[]) : [];
          if (list.length === 0) return null;
          return list.map((item, i) => (
            <section key={`${s.id}-${i}`} className="card answer-card">
              <h2>
                {s.title.en || s.repeat!.itemLabel.en} {i + 1}
              </h2>
              <Answers questions={s.questions} values={item} />
            </section>
          ));
        }
        const anything = s.questions.some((q) => q.id in a);
        if (!anything) return null;
        return (
          <section key={s.id} className="card answer-card">
            {s.title.en && <h2>{s.title.en}</h2>}
            <Answers questions={s.questions} values={a} />
          </section>
        );
      })}

      {leftover.length > 0 && (
        <section className="card answer-card">
          <h2>Answers to questions no longer on the form</h2>
          <dl className="answers">
            {leftover.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <details className="danger">
        <summary>Delete this response</summary>
        <p>This removes it for good. Use it for spam or test responses.</p>
        <form action={deleteResponse}>
          <input type="hidden" name="id" value={response.id} />
          <input type="hidden" name="slug" value={slug} />
          <button className="btn danger small" type="submit">
            Yes, delete it
          </button>
        </form>
      </details>
    </>
  );
}
