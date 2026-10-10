import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import { allowedEmails } from '@/lib/auth';
import { createSupabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  // Only reached by someone who signed in, so it is safe to say what went wrong.
  let deniedEmail: string | undefined;
  if (denied) {
    const supabase = await createSupabaseServer();
    deniedEmail = (await supabase.auth.getUser()).data.user?.email;
  }
  const noAdminsSet = allowedEmails().length === 0;

  return (
    <main className="narrow">
      <p className="eyebrow">Volunteers only</p>
      <h1 className="h-page">Admin sign in</h1>
      {denied && deniedEmail && (
        <p className="error" role="alert">
          {noAdminsSet
            ? 'You signed in, but no admin emails are set up on the server yet. Add ADMIN_EMAILS in the Vercel project settings, then redeploy.'
            : `You are signed in as ${deniedEmail}, which is not on the ADMIN_EMAILS list. Check the spelling in the Vercel project settings, then redeploy.`}
        </p>
      )}
      <LoginForm />
    </main>
  );
}
