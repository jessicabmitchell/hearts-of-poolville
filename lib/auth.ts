import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';

export function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Call at the top of every admin page, action, and route. Sends anyone who is
 * not signed in, or not on the ADMIN_EMAILS list, to the login page.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');
  if (!user.email || !allowedEmails().includes(user.email.toLowerCase())) {
    console.warn(`admin denied for ${user.email}; ADMIN_EMAILS has ${allowedEmails().length} address(es)`);
    redirect('/admin/login?denied=1');
  }
  return user;
}
