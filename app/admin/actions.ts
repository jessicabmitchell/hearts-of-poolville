'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { REQUEST_STATUSES, TAG_STATUSES, type FormState } from '@/lib/types';

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: 'error', message: 'That email and password did not match.' };
  }
  redirect('/admin');
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function updateStatus(formData: FormData) {
  await requireAdmin();

  const table = String(formData.get('table') ?? '');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');

  const valid =
    (table === 'help_requests' && (REQUEST_STATUSES as readonly string[]).includes(status)) ||
    (table === 'tag_pickups' && (TAG_STATUSES as readonly string[]).includes(status));
  if (!valid || !id) return;

  await createAdminClient().from(table).update({ status }).eq('id', id);
  revalidatePath('/admin');
}
