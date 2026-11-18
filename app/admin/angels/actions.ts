'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { TAG_FORM } from '@/lib/angels/logic';
import { linkTags, unlinkAngel } from '@/lib/angels/store';
import { getResponse } from '@/lib/forms/store';

export type AngelResult = { ok: true; message: string } | { ok: false; message: string };

const TRY_AGAIN = 'Could not save. Check your connection and try again.';

/** Match a tag form to the angel IDs a volunteer typed, like "A12, A15". */
export async function matchTags(tagResponseId: string, ids: string): Promise<AngelResult> {
  const user = await requireAdmin();
  const tag = await getResponse(tagResponseId).catch(() => null);
  if (!tag || tag.form_slug !== TAG_FORM) return { ok: false, message: 'That tag form was not found. Reload the page.' };
  try {
    const r = await linkTags(tag.id, ids.slice(0, 300), user.email ?? 'unknown');
    revalidatePath('/admin/angels');
    const parts = [
      r.matched.length ? `Matched ${r.matched.join(', ')}.` : '',
      r.taken.length ? `${r.taken.join(', ')} ${r.taken.length === 1 ? 'is' : 'are'} already matched to someone else. Remove that match first.` : '',
      r.unknown.length ? `There is no ${r.unknown.join(' or ')}.` : '',
    ].filter(Boolean);
    if (!parts.length) return { ok: false, message: 'Type the angel IDs, like A12 or A12, A15.' };
    return { ok: r.matched.length > 0, message: parts.join(' ') };
  } catch (e) {
    console.error('matchTags failed', e);
    return { ok: false, message: TRY_AGAIN };
  }
}

/** Remove an angel's tag match. */
export async function removeMatch(number: number): Promise<AngelResult> {
  await requireAdmin();
  if (!Number.isInteger(number) || number < 1) return { ok: false, message: 'Unknown angel.' };
  try {
    await unlinkAngel(number);
  } catch (e) {
    console.error('removeMatch failed', e);
    return { ok: false, message: TRY_AGAIN };
  }
  revalidatePath('/admin/angels');
  return { ok: true, message: 'Match removed.' };
}
