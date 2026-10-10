import type { Metadata } from 'next';
import Link from 'next/link';
import TagForm from '@/components/TagForm';

export const metadata: Metadata = { title: 'Angel Tree tag form' };

export default function AngelTreePage() {
  return (
    <main className="narrow">
      <p className="eyebrow">Angel Tree</p>
      <h1 className="h-page">Took a tag?</h1>
      <p className="lede small">
        Tell us which tag you took so we know who has it. Thank you for helping a neighbor.
      </p>
      <TagForm />
      <p className="note">
        Need Angel Tree help for your own family? <Link href="/request">Request help here.</Link>
      </p>
    </main>
  );
}
