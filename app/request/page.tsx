import type { Metadata } from 'next';
import RequestForm from '@/components/RequestForm';
import { PROGRAMS } from '@/lib/programs';

export const metadata: Metadata = { title: 'Request help' };

export default function RequestPage() {
  const programs = PROGRAMS.map((p) => ({ id: p.id, name: p.name, open: p.requestsOpen }));
  const anyOpen = programs.some((p) => p.open);

  return (
    <main className="narrow">
      <p className="eyebrow">Hearts of Poolville</p>
      <h1 className="h-page">Request help</h1>
      <p className="lede small">
        Tell us who you are and what your household could use. A volunteer will follow up.
      </p>
      {anyOpen ? (
        <RequestForm programs={programs} />
      ) : (
        <div className="panel">
          <p>We are not taking requests right now. Please check back soon.</p>
        </div>
      )}
    </main>
  );
}
