'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { saveFormConfig } from '@/app/admin/actions';
import { OTHER, QUESTION_TYPES, conditionTargets, emptyT, hasOptions, newId } from '@/lib/forms/logic';
import { openLabel } from '@/lib/forms/status';
import type { Condition, FormConfig, Question, QuestionType, Section, T } from '@/lib/forms/types';

const TYPE_NAMES: Record<QuestionType, string> = {
  short: 'Short answer',
  long: 'Long answer (several lines)',
  email: 'Email address',
  phone: 'Phone number',
  number: 'Number',
  choice: 'Pick one (round buttons)',
  checkboxes: 'Pick any (checkboxes)',
};

const savedFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function move<X>(list: X[], i: number, by: -1 | 1): X[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ---------- Small building blocks ----------

/** One piece of text in English and Spanish, side by side. */
function BiText({
  label,
  value,
  onChange,
  long,
  help,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  long?: boolean;
  help?: string;
}) {
  const Input = long ? 'textarea' : 'input';
  return (
    <div className="bi">
      <span className="bi-label">{label}</span>
      <div className="bi-row">
        <label>
          <span>English</span>
          <Input value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
        </label>
        <label>
          <span>Español</span>
          <Input value={value.es} onChange={(e) => onChange({ ...value, es: e.target.value })} />
        </label>
      </div>
      {help && <span className="hint">{help}</span>}
    </div>
  );
}

function Check({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {help && <em> &middot; {help}</em>}
      </span>
    </label>
  );
}

/** Buttons to move, and to delete with a second click to confirm. */
function ItemTools({
  onUp,
  onDown,
  onDelete,
  what,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onDelete: () => void;
  what: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="tools">
      <button type="button" className="btn ghost small" onClick={onUp} disabled={!onUp} aria-label={`Move ${what} up`}>
        ↑
      </button>
      <button type="button" className="btn ghost small" onClick={onDown} disabled={!onDown} aria-label={`Move ${what} down`}>
        ↓
      </button>
      {confirming ? (
        <>
          <button type="button" className="btn danger small" onClick={onDelete}>
            Yes, delete {what}
          </button>
          <button type="button" className="btn ghost small" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </>
      ) : (
        <button type="button" className="btn ghost small" onClick={() => setConfirming(true)}>
          Delete
        </button>
      )}
    </div>
  );
}

/** "Only show this if ..." */
function ConditionPicker({
  value,
  targets,
  onChange,
}: {
  value: Condition | null;
  targets: Question[];
  onChange: (v: Condition | null) => void;
}) {
  if (targets.length === 0) return null;
  const q = targets.find((t) => t.id === value?.question);
  const options = q ? [...q.options, ...(q.other ? [{ id: OTHER, label: { en: 'Other', es: '' } }] : [])] : [];
  return (
    <div className="condition">
      <span className="bi-label">When to show it</span>
      <div className="condition-row">
        <select
          value={value?.question ?? ''}
          onChange={(e) => {
            const target = targets.find((t) => t.id === e.target.value);
            onChange(target && target.options[0] ? { question: target.id, equals: target.options[0].id } : null);
          }}
        >
          <option value="">Always</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              Only if “{t.label.en || 'Untitled question'}” is…
            </option>
          ))}
        </select>
        {q && (
          <select value={value?.equals ?? ''} onChange={(e) => onChange({ question: q.id, equals: e.target.value })}>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label.en || 'Untitled choice'}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ---------- Questions ----------

function QuestionEditor({
  q,
  number,
  targets,
  inRepeat,
  open,
  onToggle,
  onChange,
  tools,
}: {
  q: Question;
  number: number;
  targets: Question[];
  inRepeat: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (q: Question) => void;
  tools: React.ReactNode;
}) {
  const set = (more: Partial<Question>) => onChange({ ...q, ...more });
  return (
    <div className={open ? 'q-card is-open' : 'q-card'}>
      <div className="q-head">
        <button type="button" className="q-summary" onClick={onToggle} aria-expanded={open}>
          <span className="q-num">{number}.</span>
          <span className="q-label">{q.label.en || 'Untitled question'}</span>
          <span className="q-meta">
            {TYPE_NAMES[q.type].split(' (')[0]}
            {q.required ? ' · required' : ''}
            {q.showIf ? ' · sometimes shown' : ''}
          </span>
        </button>
        {tools}
      </div>
      {open && (
        <div className="q-body">
          <BiText label="Question" value={q.label} onChange={(label) => set({ label })} />
          <label className="field">
            <span className="bi-label">Kind of answer</span>
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as QuestionType;
                set({
                  type,
                  options: hasOptions(type) ? (q.options.length ? q.options : [{ id: newId('o_'), label: emptyT() }]) : [],
                  other: hasOptions(type) && q.other,
                });
              }}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_NAMES[t]}
                </option>
              ))}
            </select>
          </label>

          {hasOptions(q.type) && (
            <div className="options">
              <span className="bi-label">Choices</span>
              {q.options.map((o, i) => (
                <div key={o.id} className="option-row">
                  <input
                    aria-label={`Choice ${i + 1} in English`}
                    placeholder="English"
                    value={o.label.en}
                    onChange={(e) =>
                      set({ options: q.options.map((x) => (x.id === o.id ? { ...x, label: { ...x.label, en: e.target.value } } : x)) })
                    }
                  />
                  <input
                    aria-label={`Choice ${i + 1} in Spanish`}
                    placeholder="Español"
                    value={o.label.es}
                    onChange={(e) =>
                      set({ options: q.options.map((x) => (x.id === o.id ? { ...x, label: { ...x.label, es: e.target.value } } : x)) })
                    }
                  />
                  <ItemTools
                    what="choice"
                    onUp={i > 0 ? () => set({ options: move(q.options, i, -1) }) : undefined}
                    onDown={i < q.options.length - 1 ? () => set({ options: move(q.options, i, 1) }) : undefined}
                    onDelete={() => set({ options: q.options.filter((x) => x.id !== o.id) })}
                  />
                </div>
              ))}
              <div>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => set({ options: [...q.options, { id: newId('o_'), label: emptyT() }] })}
                >
                  + Add choice
                </button>
              </div>
              <Check
                label="Add an “Other” choice with a box to type in"
                checked={q.other}
                onChange={(other) => set({ other })}
              />
            </div>
          )}

          <BiText label="Extra help under the question (optional)" value={q.help} onChange={(help) => set({ help })} />
          <Check label="Required" checked={q.required} onChange={(required) => set({ required })} />
          <Check
            label="Show in the results list"
            help="adds a column on the results page"
            checked={q.inList}
            onChange={(inList) => set({ inList })}
          />
          {!inRepeat && (
            <ConditionPicker
              value={q.showIf}
              targets={targets.filter((t) => t.id !== q.id)}
              onChange={(showIf) => set({ showIf })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Sections ----------

function SectionEditor({
  s,
  index,
  targets,
  questionTargets,
  openQuestions,
  toggleQuestion,
  onChange,
  tools,
}: {
  s: Section;
  index: number;
  targets: Question[];
  questionTargets: (questionId: string) => Question[];
  openQuestions: Set<string>;
  toggleQuestion: (id: string) => void;
  onChange: (s: Section) => void;
  tools: React.ReactNode;
}) {
  const set = (more: Partial<Section>) => onChange({ ...s, ...more });
  const setQuestion = (i: number, q: Question) => set({ questions: s.questions.map((x, j) => (j === i ? q : x)) });

  return (
    <section className="card section-card">
      <div className="section-head">
        <h3>
          Part {index + 1}
          {s.title.en ? `: ${s.title.en}` : ''}
          {s.repeat ? <span className="pill tone-soon">repeats</span> : null}
        </h3>
        {tools}
      </div>

      <details className="section-settings">
        <summary>Part heading and settings</summary>
        <BiText label="Heading (optional)" value={s.title} onChange={(title) => set({ title })} />
        <BiText label="Note under the heading (optional)" value={s.description} onChange={(description) => set({ description })} long />
        <ConditionPicker value={s.showIf} targets={targets} onChange={(showIf) => set({ showIf })} />
        <Check
          label="People can fill this part out more than once"
          help="for example, once per child"
          checked={Boolean(s.repeat)}
          onChange={(on) =>
            set({
              repeat: on ? { max: 10, itemLabel: { en: 'Child', es: 'Niño' }, addLabel: { en: 'Add another', es: 'Agregar otro' } } : null,
              questions: on ? s.questions.map((q) => ({ ...q, showIf: null })) : s.questions,
            })
          }
        />
        {s.repeat && (
          <div className="repeat-settings">
            <BiText
              label="Name for one copy (numbered on the form, like “Child 1”)"
              value={s.repeat.itemLabel}
              onChange={(itemLabel) => set({ repeat: { ...s.repeat!, itemLabel } })}
            />
            <BiText
              label="Text on the add button"
              value={s.repeat.addLabel}
              onChange={(addLabel) => set({ repeat: { ...s.repeat!, addLabel } })}
            />
            <label className="field narrow-field">
              <span className="bi-label">Most copies allowed</span>
              <input
                type="number"
                min={1}
                max={50}
                value={s.repeat.max}
                onChange={(e) => set({ repeat: { ...s.repeat!, max: Number(e.target.value) || 1 } })}
              />
            </label>
          </div>
        )}
      </details>

      <div className="q-list">
        {s.questions.length === 0 && <p className="fine">No questions in this part yet.</p>}
        {s.questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            q={q}
            number={i + 1}
            targets={questionTargets(q.id)}
            inRepeat={Boolean(s.repeat)}
            open={openQuestions.has(q.id)}
            onToggle={() => toggleQuestion(q.id)}
            onChange={(next) => setQuestion(i, next)}
            tools={
              <ItemTools
                what="question"
                onUp={i > 0 ? () => set({ questions: move(s.questions, i, -1) }) : undefined}
                onDown={i < s.questions.length - 1 ? () => set({ questions: move(s.questions, i, 1) }) : undefined}
                onDelete={() => set({ questions: s.questions.filter((x) => x.id !== q.id) })}
              />
            }
          />
        ))}
      </div>
      <div>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            const q: Question = {
              id: newId('q_'),
              type: 'short',
              label: emptyT(),
              help: emptyT(),
              required: false,
              options: [],
              other: false,
              showIf: null,
              inList: false,
            };
            set({ questions: [...s.questions, q] });
            toggleQuestion(q.id);
          }}
        >
          + Add question
        </button>
      </div>
    </section>
  );
}

// ---------- The whole editor ----------

export type VersionInfo = { id: number; savedAt: string; savedBy: string | null; config: FormConfig };

export default function FormEditor({
  slug,
  initial,
  publicPath,
  updatedAt,
  updatedBy,
  versions,
}: {
  slug: string;
  initial: FormConfig;
  publicPath: string;
  updatedAt: string | null;
  updatedBy: string | null;
  versions: VersionInfo[];
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  // Warn before leaving the page with changes that are not saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (more: Partial<FormConfig>) => {
    setConfig((c) => ({ ...c, ...more }));
    setMessage(null);
  };
  const setSection = (i: number, s: Section) => set({ sections: config.sections.map((x, j) => (j === i ? s : x)) });
  const toggleQuestion = (id: string) =>
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Conditions may only point at questions that come earlier on the form.
  const allTargets = conditionTargets(config);
  const order = config.sections.flatMap((s) => s.questions.map((q) => q.id));
  const before = (id: string) => allTargets.filter((t) => order.indexOf(t.id) < order.indexOf(id));
  const beforeSection = (s: Section) => {
    const first = s.questions[0]?.id;
    return first ? before(first) : allTargets.filter((t) => !s.questions.some((q) => q.id === t.id));
  };

  const save = () =>
    startSaving(async () => {
      const result = await saveFormConfig(slug, config);
      if (result.ok) {
        setSaved(config);
        setMessage({ tone: 'ok', text: 'Saved. The live form now shows these changes.' });
        router.refresh();
      } else {
        setMessage({ tone: 'error', text: result.message });
      }
    });

  const status = openLabel(config);

  return (
    <div className="editor">
      <div className="admin-title">
        <div>
          <h1>Edit: {saved.name}</h1>
          <p className="fine">
            {/* Worked out from today's date, which can differ by a moment between server and browser. */}
            <span className={`pill tone-${status.tone}`} suppressHydrationWarning>
              {status.text}
            </span>
            {updatedAt && (
              <>
                {' '}
                &middot; Last saved {savedFmt.format(new Date(updatedAt))}
                {updatedBy ? ` by ${updatedBy}` : ''}
              </>
            )}
          </p>
        </div>
        <div className="title-links">
          <a className="textlink" href={publicPath} target="_blank" rel="noopener noreferrer">
            View form ↗
          </a>
          <Link className="textlink" href={`/admin/results/${slug}`}>
            See responses
          </Link>
        </div>
      </div>

      <section className="card">
        <h2>Is it open?</h2>
        <Check
          label="Form is turned on"
          help="turn off to close it right away, whatever the dates say"
          checked={config.enabled}
          onChange={(enabled) => set({ enabled })}
        />
        <div className="date-row">
          <label className="field">
            <span className="bi-label">Opens on</span>
            <input type="date" value={config.opens ?? ''} onChange={(e) => set({ opens: e.target.value || null })} />
            <span className="hint">Leave empty to open right away.</span>
          </label>
          <label className="field">
            <span className="bi-label">Closes after</span>
            <input type="date" value={config.closes ?? ''} onChange={(e) => set({ closes: e.target.value || null })} />
            <span className="hint">The form stays open all of this day. Leave empty for no end.</span>
          </label>
        </div>
        <BiText label="Message shown when it's closed" value={config.closedMessage} onChange={(closedMessage) => set({ closedMessage })} />
      </section>

      <section className="card">
        <h2>Top of the form</h2>
        <label className="field">
          <span className="bi-label">Name in this menu (only volunteers see it)</span>
          <input value={config.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <BiText label="Small heading above the title" value={config.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
        <BiText label="Title" value={config.title} onChange={(title) => set({ title })} />
        <BiText
          label="Introduction"
          value={config.intro}
          onChange={(intro) => set({ intro })}
          long
          help="Leave a blank line between paragraphs. Put **two stars** around words to make them bold. The closing date is shown above this automatically."
        />
      </section>

      <h2 className="editor-h">Questions</h2>
      <p className="fine">
        The form is split into parts. Click a question to change it. Answers people already sent are kept even if you
        change or delete a question.
      </p>
      {config.sections.map((s, i) => (
        <SectionEditor
          key={s.id}
          s={s}
          index={i}
          targets={beforeSection(s)}
          questionTargets={before}
          openQuestions={openQuestions}
          toggleQuestion={toggleQuestion}
          onChange={(next) => setSection(i, next)}
          tools={
            <ItemTools
              what="part"
              onUp={i > 0 ? () => set({ sections: move(config.sections, i, -1) }) : undefined}
              onDown={i < config.sections.length - 1 ? () => set({ sections: move(config.sections, i, 1) }) : undefined}
              onDelete={() => set({ sections: config.sections.filter((x) => x.id !== s.id) })}
            />
          }
        />
      ))}
      <div>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            set({
              sections: [
                ...config.sections,
                { id: newId('s_'), title: emptyT(), description: emptyT(), showIf: null, repeat: null, questions: [] },
              ],
            })
          }
        >
          + Add a part
        </button>
      </div>

      <section className="card">
        <h2>After someone sends it</h2>
        <BiText label="Text on the send button" value={config.submitLabel} onChange={(submitLabel) => set({ submitLabel })} />
        <BiText label="Thank-you heading" value={config.thanksTitle} onChange={(thanksTitle) => set({ thanksTitle })} />
        <BiText label="Thank-you message" value={config.thanksBody} onChange={(thanksBody) => set({ thanksBody })} long />
      </section>

      <section className="card">
        <h2>Settings</h2>
        <Check
          label="Require a phone number or an email"
          help="uses the first phone and email questions"
          checked={config.contactRule}
          onChange={(contactRule) => set({ contactRule })}
        />
        <Check
          label="List this form on the Request help page"
          checked={config.onRequestPage}
          onChange={(onRequestPage) => set({ onRequestPage })}
        />
        <div className="options">
          <span className="bi-label">Statuses volunteers can pick on a response</span>
          <span className="hint">New responses get the first one.</span>
          {config.statuses.map((st, i) => (
            <div key={i} className="option-row">
              <input
                aria-label={`Status ${i + 1}`}
                value={st}
                onChange={(e) => set({ statuses: config.statuses.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <ItemTools
                what="status"
                onUp={i > 0 ? () => set({ statuses: move(config.statuses, i, -1) }) : undefined}
                onDown={i < config.statuses.length - 1 ? () => set({ statuses: move(config.statuses, i, 1) }) : undefined}
                onDelete={() => set({ statuses: config.statuses.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          <div>
            <button type="button" className="btn ghost small" onClick={() => set({ statuses: [...config.statuses, ''] })}>
              + Add status
            </button>
          </div>
        </div>
      </section>

      {versions.length > 0 && (
        <section className="card">
          <h2>Earlier versions</h2>
          <p className="fine">
            Made a mistake? Load an earlier version, check it, then click Save to put it back. Nothing changes on the
            live form until you save.
          </p>
          <ul className="versions">
            {versions.map((v) => (
              <li key={v.id}>
                <span>
                  Before the save on {savedFmt.format(new Date(v.savedAt))}
                  {v.savedBy ? ` by ${v.savedBy}` : ''}
                </span>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    setConfig(v.config);
                    setMessage({ tone: 'ok', text: 'Earlier version loaded. Click Save to put it back on the live form.' });
                    window.scrollTo(0, 0);
                  }}
                >
                  Load this version
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={dirty || message ? 'savebar show' : 'savebar'}>
        <span role="status" className={message?.tone === 'error' ? 'savebar-msg error-text' : 'savebar-msg'}>
          {message?.text ?? (dirty ? 'You have changes that are not saved.' : '')}
        </span>
        <div className="savebar-buttons">
          {dirty && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setConfig(saved);
                setMessage(null);
              }}
            >
              Undo changes
            </button>
          )}
          <button type="button" className="btn primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
