import { requireAdmin } from '@/lib/auth';
import { sheet } from '@/lib/forms/results';
import { getForm, getResponses } from '@/lib/forms/store';

export const dynamic = 'force-dynamic';

// Quote every cell, and defuse values a spreadsheet could read as a formula.
function cell(value: string): string {
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const form = await getForm(slug);
  if (!form) return new Response('Unknown form', { status: 404 });

  let rows;
  try {
    rows = await getResponses(slug);
  } catch {
    return new Response('Could not load data', { status: 500 });
  }
  const status = new URL(request.url).searchParams.get('status');
  if (status) rows = rows.filter((r) => r.status === status);

  const lines = sheet(form.config, rows).map((row) => row.map(cell).join(','));
  // The byte-order mark helps Excel open accented letters (Spanish answers) correctly.
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
