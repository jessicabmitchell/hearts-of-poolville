export type Program = {
  id: string;
  name: string;
  season: string;
  blurb: string;
  /** true = the request form accepts this program right now */
  requestsOpen: boolean;
};

// Flip requestsOpen to true when a program starts taking requests, false when it closes.
export const PROGRAMS: Program[] = [
  {
    id: 'easter',
    name: 'Easter baskets',
    season: 'Spring',
    blurb: 'Baskets for kids in our community.',
    requestsOpen: false,
  },
  {
    id: 'back_to_school',
    name: 'Back-to-school supplies',
    season: 'Late summer',
    blurb: 'Supplies so students start the year ready.',
    requestsOpen: false,
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving dinners',
    season: 'November',
    blurb: 'A holiday meal for families who could use one.',
    requestsOpen: true,
  },
  {
    id: 'angel_tree',
    name: 'Angel Tree',
    season: 'Holiday season',
    blurb: 'Take a tag from the tree and help a neighbor in need.',
    requestsOpen: true,
  },
  {
    id: 'christmas',
    name: 'Christmas dinners',
    season: 'December',
    blurb: 'A Christmas meal for families who could use one.',
    requestsOpen: true,
  },
];

export function programName(id: string): string {
  return PROGRAMS.find((p) => p.id === id)?.name ?? id;
}
