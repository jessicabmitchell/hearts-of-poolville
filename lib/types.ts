export type FormState = {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  values?: Record<string, string | string[]>;
};

export const REQUEST_STATUSES = ['new', 'in_progress', 'fulfilled'] as const;
export const TAG_STATUSES = ['picked', 'returned'] as const;

export type HelpRequest = {
  id: string;
  created_at: string;
  programs: string[];
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  household_size: number | null;
  details: string | null;
  status: (typeof REQUEST_STATUSES)[number];
};

export type TagPickup = {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  tag_numbers: string;
  notes: string | null;
  status: (typeof TAG_STATUSES)[number];
};
