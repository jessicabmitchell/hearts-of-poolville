// The programs listed on the home page. Each one points at the form people use to ask for it;
// the "Requests open" tag follows that form's dates and on/off switch on the admin page.

export type Program = {
  id: string;
  name: string;
  season: string;
  blurb: string;
  formSlug: string;
};

export const PROGRAMS: Program[] = [
  {
    id: 'easter',
    name: 'Easter baskets',
    season: 'Spring',
    blurb: 'Baskets for kids in our community.',
    formSlug: 'easter',
  },
  {
    id: 'back_to_school',
    name: 'Back-to-school supplies',
    season: 'Late summer',
    blurb: 'Supplies so students start the year ready.',
    formSlug: 'back_to_school',
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving dinners',
    season: 'November',
    blurb: 'A holiday meal for families who could use one.',
    formSlug: 'thanksgiving',
  },
  {
    id: 'angel_tree',
    name: 'Angel Tree',
    season: 'Holiday season',
    blurb: 'Take a tag from the tree and help a neighbor in need.',
    formSlug: 'angel_tree',
  },
  {
    id: 'christmas',
    name: 'Christmas dinners',
    season: 'December',
    blurb: 'A Christmas meal for families who could use one.',
    formSlug: 'christmas',
  },
];
