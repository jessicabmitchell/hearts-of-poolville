import { notFound } from 'next/navigation';
import LangToggle from '@/components/LangToggle';
import { dict, type Lang } from '@/lib/i18n';
import { formPath } from '@/lib/forms/defaults';
import { formatDay, openState, tx } from '@/lib/forms/logic';
import { getFilled, getForm } from '@/lib/forms/store';
import FormRenderer from './FormRenderer';
import RichText from './RichText';

/** A public form page: heading, intro, and the form or a closed message. */
export default async function PublicFormPage({ slug, lang }: { slug: string; lang: Lang }) {
  const form = await getForm(slug);
  if (!form || form.config.archived) notFound();
  const c = form.config;
  const filled = c.capacity ? await getFilled(slug, c).catch(() => 0) : 0;
  const state = openState(c, undefined, filled);
  const common = dict(lang).common;

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path={formPath(slug)} lang={lang} />
      {tx(c.eyebrow, lang) && <p className="eyebrow">{tx(c.eyebrow, lang)}</p>}
      <h1 className="h-page">{tx(c.title, lang)}</h1>
      {c.closes && (state === 'open' || state === 'not_yet') && (
        <p className="lede small">
          {common.deadline} <strong>{formatDay(c.closes, lang)}</strong>.
        </p>
      )}
      <RichText text={tx(c.intro, lang)} className="lede small" />
      {state === 'open' ? (
        <FormRenderer slug={slug} config={c} lang={lang} />
      ) : (
        <div className="panel">
          <p>
            {state === 'not_yet' && c.opens
              ? `${common.opensOn} ${formatDay(c.opens, lang)}.`
              : state === 'full'
                ? tx(c.fullMessage, lang) || dict(lang).errors.full
                : tx(c.closedMessage, lang) || dict(lang).errors.closed}
          </p>
        </div>
      )}
    </main>
  );
}
