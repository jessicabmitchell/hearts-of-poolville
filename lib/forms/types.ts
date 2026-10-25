// How a form is described. Forms are saved as this shape in the `forms` table and edited on the
// admin page, so every field here is plain data.

/** Text in both languages. Empty Spanish falls back to English on the public form. */
export type T = { en: string; es: string };

export type QuestionType = 'short' | 'long' | 'email' | 'phone' | 'number' | 'choice' | 'checkboxes';

export type Option = { id: string; label: T };

/** Show something only when an earlier question has this option picked. */
export type Condition = { question: string; equals: string };

export type Question = {
  id: string;
  type: QuestionType;
  label: T;
  help: T;
  required: boolean;
  /** For choice and checkboxes. */
  options: Option[];
  /** Adds an "Other" choice with a text box. */
  other: boolean;
  showIf: Condition | null;
  /** Show this answer as a column in the results list. */
  inList: boolean;
};

export type Repeat = {
  /** Most copies someone can add, for example 10 children. */
  max: number;
  /** Name for one copy, numbered on the form: "Child 1", "Child 2". */
  itemLabel: T;
  addLabel: T;
};

export type Section = {
  id: string;
  title: T;
  description: T;
  showIf: Condition | null;
  /** null = shown once. Set = people can add several copies (one per child, and so on). */
  repeat: Repeat | null;
  questions: Question[];
};

export type FormConfig = {
  /** Short name shown in the admin menu. */
  name: string;
  eyebrow: T;
  title: T;
  intro: T;
  /** false = closed no matter what the dates say. */
  enabled: boolean;
  /** 'YYYY-MM-DD' in Poolville time, or null for no limit. Both days count as open. */
  opens: string | null;
  closes: string | null;
  closedMessage: T;
  /**
   * Close the form once this many have signed up, or null for no limit. Counts copies of the first
   * repeating part (each child on the Angel Tree form), or whole responses if there is none.
   */
  capacity: number | null;
  /** What is being counted, for volunteers: "angels", "families". */
  capacityUnit: string;
  /** Shown instead of the form once the limit is reached. */
  fullMessage: T;
  submitLabel: T;
  thanksTitle: T;
  thanksBody: T;
  /** Require at least one of the phone and email questions. */
  contactRule: boolean;
  /** List this form on the Request help page. */
  onRequestPage: boolean;
  /** Old forms kept only so their responses stay visible. Hidden from the public and from editing. */
  archived: boolean;
  /** Statuses volunteers can set on a response. The first one is given to new responses. */
  statuses: string[];
  sections: Section[];
};

/** A saved form, as read from the database. */
export type StoredForm = {
  slug: string;
  config: FormConfig;
  updatedAt: string | null;
  updatedBy: string | null;
};

/** Answers to one question: text, or a list of picked options for checkboxes. */
export type Answer = string | string[];

/** Answers to one response, keyed by question id. A repeating section stores a list under its section id. */
export type Answers = Record<string, Answer | Record<string, Answer>[]>;

export type ResponseRow = {
  id: string;
  form_slug: string;
  created_at: string;
  language: 'en' | 'es';
  status: string;
  answers: Answers;
};
