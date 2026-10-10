import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const COLUMNS = {
  help_requests: ['created_at', 'programs', 'name', 'phone', 'email', 'address', 'household_size', 'details', 'status'],
  tag_pickups: ['created_at', 'name', 'tag_numbers', 'phone', 'email', 'notes', 'status'],
  angel_tree_applications: [
    'created_at',
    'for_self',
    'name',
    'phone',
    'email',
    'pickup_by',
    'parent_name',
    'parent_phone',
    'parent_email',
    'address',
    'child_name',
    'age',
    'gender',
    'shirt_size',
    'jeans_size',
    'shoe_size',
    'coat_size',
    'bedding_size',
    'interests',
    'favorite_color',
    'wishes',
    'language',
    'status',
  ],
  dinner_applications: [
    'created_at',
    'holiday',
    'for_self',
    'name',
    'phone',
    'email',
    'pickup_by',
    'recipient_name',
    'recipient_phone',
    'recipient_email',
    'household_size',
    'address',
    'language',
    'status',
  ],
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
  if (!table || !Object.hasOwn(COLUMNS, table)) {
    return new Response('Unknown table', { status: 400 });
  }
  const holiday = new URL(request.url).searchParams.get('holiday');

  let query = createAdminClient().from(table).select('*');
  if (table === 'dinner_applications' && holiday) query = query.eq('holiday', holiday);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return new Response('Could not load data', { status: 500 });

  const cols: readonly string[] = COLUMNS[table as keyof typeof COLUMNS];
  const lines = [
    cols.join(','),
    ...(data ?? []).map((row) => cols.map((c) => cell((row as Record<string, unknown>)[c])).join(',')),
  ];

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${holiday && table === 'dinner_applications' ? `${holiday}_dinners` : table}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
