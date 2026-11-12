import type { MealResult } from '@/app/admin/meals/actions';

/** Run a save, turning a dropped connection into a message instead of a broken page. */
export async function tryAction(run: () => Promise<MealResult>): Promise<MealResult> {
  try {
    return await run();
  } catch (e) {
    console.error(e);
    return { ok: false, message: 'Could not reach the website. Check your connection and try again.' };
  }
}
