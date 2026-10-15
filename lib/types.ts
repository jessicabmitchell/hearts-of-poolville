export type FormState = {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  values?: Record<string, string | string[]>;
};

export const REQUEST_STATUSES = ['new', 'in_progress', 'fulfilled'] as const;
export const TAG_STATUSES = ['picked', 'returned'] as const;
export const HELP_STATUSES = ['new', 'contacted'] as const;

/** Ways to help on the /help form, in the order they appear. */
export const HELP_OPTIONS = ['christmas', 'thanksgiving', 'angel_tree', 'easter', 'back_to_school', 'other'] as const;
export type HelpOption = (typeof HELP_OPTIONS)[number];

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

export type DinnerApplication = {
  id: string;
  created_at: string;
  holiday: 'thanksgiving' | 'christmas';
  for_self: boolean;
  name: string;
  phone: string | null;
  email: string | null;
  pickup_by: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  household_size: number | null;
  address: string | null;
  language: 'en' | 'es';
  status: (typeof REQUEST_STATUSES)[number];
};

export type AngelTreeApplication = {
  id: string;
  created_at: string;
  family_id: string | null;
  for_self: boolean;
  name: string;
  phone: string | null;
  email: string | null;
  pickup_by: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  address: string | null;
  child_name: string;
  age: string;
  gender: 'male' | 'female' | null;
  shirt_size: string | null;
  jeans_size: string | null;
  shoe_size: string | null;
  coat_size: string | null;
  bedding_size: string | null;
  interests: string | null;
  favorite_color: string | null;
  wishes: string | null;
  language: 'en' | 'es';
  status: (typeof REQUEST_STATUSES)[number];
};

export type HelpOffer = {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  help_with: HelpOption[];
  other: string | null;
  language: 'en' | 'es';
  status: (typeof HELP_STATUSES)[number];
};
