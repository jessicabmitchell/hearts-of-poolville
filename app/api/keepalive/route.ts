import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Weekly ping that keeps a free Supabase project from pausing for inactivity.
// Vercel Cron calls this and sends "Authorization: Bearer <CRON_SECRET>" automatically.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // A cheap read: counts rows without returning any of them.
  const { error } = await createAdminClient()
    .from('forms')
    .select('slug', { head: true, count: 'exact' });

  if (error) {
    console.error('keepalive failed', error);
    return new Response('Database check failed', { status: 500 });
  }
  return Response.json({ ok: true });
}
