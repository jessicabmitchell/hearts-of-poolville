import type { Metadata } from 'next';
import Link from 'next/link';
import LangToggle from '@/components/LangToggle';
import { dict, toLang } from '@/lib/i18n';
import { formPath } from '@/lib/forms/defaults';
import { formatDay, openState, tx } from '@/lib/forms/logic';
import { getAllForms } from '@/lib/forms/store';

export const metadata: Metadata = { title: 'Request help' };

/** Links to every form marked "List on the Request help page" on the admin page. */
export default async function RequestPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = toLang((await searchParams).lang);
  const t = dict(lang).request;
  const forms = (await getAllForms()).filter((f) => f.config.onRequestPage && !f.config.archived);
  const href = (slug: string) => (lang === 'es' ? `${formPath(slug)}?lang=es` : formPath(slug));

  const open = forms.filter((f) => openState(f.config) === 'open');
  const upcoming = forms
    .filter((f) => openState(f.config) === 'not_yet' && f.config.opens)
    .sort((a, b) => a.config.opens!.localeCompare(b.config.opens!));

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path="/request" lang={lang} />
      <p className="eyebrow">Hearts of Poolville</p>
      <h1 className="h-page">{t.title}</h1>
      <p className="lede small">{t.lede}</p>

      {open.length > 0 ? (
        <div className="form">
          <h2 className="h-sm">{t.chooseForm}</h2>
          {open.map((f) => (
            <p key={f.slug} className="check">
              <Link href={href(f.slug)}>{tx(f.config.title, lang)} &rarr;</Link>
            </p>
          ))}
        </div>
      ) : (
        <div className="panel">
          <p>{t.closed}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="form request-other">
          <h2 className="h-sm">{t.comingUp}</h2>
          {upcoming.map((f) => (
            <p key={f.slug} className="check">
              <span>
                {tx(f.config.title, lang)}
                <em>
                  {' '}
                  &middot; {t.opens} {formatDay(f.config.opens!, lang)}
                </em>
              </span>
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
