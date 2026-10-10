export type Program = {
  id: string;
  name: string;
  /** Spanish name, shown on the request form in Spanish */
  nameEs: string;
  season: string;
  blurb: string;
  /** false = closed no matter what. true = open, or open between `opens` and `closes` when those are set. */
  requestsOpen: boolean;
  /** First day applications are accepted, as 'YYYY-MM-DD' (Poolville time). */
  opens?: string;
  /** Last day applications are accepted, as 'YYYY-MM-DD'. Shown on the form as the deadline. */
  closes?: string;
  /** Set when the program has its own form instead of the shared request form */
  formHref?: string;
};

export type Holiday = 'thanksgiving' | 'christmas';
export const HOLIDAYS: Holiday[] = ['thanksgiving', 'christmas'];

// Pickup days shown on the forms. Update these each year.
export const ANGEL_TREE_PICKUP_DAYS = ['2026-12-20', '2026-12-21', '2026-12-22'];
export const DINNER_PICKUP: Record<Holiday, string> = {
  thanksgiving: '2026-11-24',
  christmas: '2026-12-22',
};

// Each year, update `opens` and `closes`. Programs without dates are open while requestsOpen is true.
export const PROGRAMS: Program[] = [
  {
    id: 'easter',
    name: 'Easter baskets',
    nameEs: 'Canastas de Pascua',
    season: 'Spring',
    blurb: 'Baskets for kids in our community.',
    requestsOpen: false,
  },
  {
    id: 'back_to_school',
    name: 'Back-to-school supplies',
    nameEs: 'Útiles escolares',
    season: 'Late summer',
    blurb: 'Supplies so students start the year ready.',
    requestsOpen: false,
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving dinners',
    nameEs: 'Cenas de Acción de Gracias',
    season: 'November',
    blurb: 'A holiday meal for families who could use one.',
    requestsOpen: true,
    opens: '2026-10-31',
    closes: '2026-11-15',
    formHref: '/thanksgiving',
  },
  {
    id: 'angel_tree',
    name: 'Angel Tree',
    nameEs: 'Árbol de Ángeles',
    season: 'Holiday season',
    blurb: 'Take a tag from the tree and help a neighbor in need.',
    requestsOpen: true,
    opens: '2026-10-17',
    closes: '2026-11-21',
    formHref: '/angel-tree/apply',
  },
  {
    id: 'christmas',
    name: 'Christmas dinners',
    nameEs: 'Cenas de Navidad',
    season: 'December',
    blurb: 'A Christmas meal for families who could use one.',
    requestsOpen: true,
    opens: '2026-12-01',
    closes: '2026-12-15',
    formHref: '/christmas',
  },
];

export function programName(id: string): string {
  return PROGRAMS.find((p) => p.id === id)?.name ?? id;
}

export function getProgram(id: string): Program {
  const p = PROGRAMS.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown program: ${id}`);
  return p;
}

/** Today's date in Poolville as 'YYYY-MM-DD'. */
function today(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(now);
}

export type OpenState = 'open' | 'not_yet' | 'closed';

/** Whether a program takes applications today. Opening and closing days both count as open. */
export function openState(p: Program, now = new Date()): OpenState {
  if (!p.requestsOpen) return 'closed';
  const day = today(now);
  if (p.opens && day < p.opens) return 'not_yet';
  if (p.closes && day > p.closes) return 'closed';
  return 'open';
}

export function isOpen(p: Program, now = new Date()): boolean {
  return openState(p, now) === 'open';
}
