import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  return (
    <main className="narrow">
      <p className="eyebrow">Volunteers only</p>
      <h1 className="h-page">Admin sign in</h1>
      {denied && (
        <p className="error" role="alert">
          That account does not have access to the admin page.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
