import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const COLUMNS = {
  help_requests: ['created_at', 'programs', 'name', 'phone', 'email', 'address', 'household_size', 'details', 'status'],
  tag_pickups: ['created_at', 'name', 'tag_numbers', 'phone', 'email', 'notes', 'status'],
} as const;

// Quote every cell, and defuse values a spreadsheet could read as a formula.
function cell(value: unknown): string {
  let s = Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requireAdmin();

  const table = new URL(request.url).searchParams.get('table');
  if (table !== 'help_requests' && table !== 'tag_pickups') {
    return new Response('Unknown table', { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from(table)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return new Response('Could not load data', { status: 500 });

  const cols = COLUMNS[table];
  const lines = [
    cols.join(','),
    ...(data ?? []).map((row) => cols.map((c) => cell((row as Record<string, unknown>)[c])).join(',')),
  ];

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
