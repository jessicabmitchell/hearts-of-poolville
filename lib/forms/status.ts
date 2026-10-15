import { openState } from './logic';
import type { FormConfig } from './types';

const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const day = (iso: string) => short.format(new Date(`${iso}T12:00:00Z`));

/** Plain words for whether a form is taking responses, for the admin pages. */
export function openLabel(c: FormConfig): { text: string; tone: 'open' | 'soon' | 'closed' } {
  const state = openState(c);
  if (state === 'open') return { text: c.closes ? `Open until ${day(c.closes)}` : 'Open', tone: 'open' };
  if (state === 'not_yet') return { text: `Opens ${day(c.opens!)}`, tone: 'soon' };
  if (!c.enabled) return { text: 'Turned off', tone: 'closed' };
  return { text: c.closes ? `Closed ${day(c.closes)}` : 'Closed', tone: 'closed' };
}
