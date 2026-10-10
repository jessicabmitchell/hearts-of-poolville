import type { Metadata } from 'next';
import Link from 'next/link';
import LangToggle from '@/components/LangToggle';
import RequestForm from '@/components/RequestForm';
import { dict, formatDay, toLang } from '@/lib/i18n';
import { PROGRAMS, isOpen, openState } from '@/lib/programs';

export const metadata: Metadata = { title: 'Request help' };

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = toLang((await searchParams).lang);
  const t = dict(lang).request;
  const nameOf = (p: (typeof PROGRAMS)[number]) => (lang === 'es' ? p.nameEs : p.name);

  // Programs with their own form are links; the rest share the request form below.
  const ownForms = PROGRAMS.filter((p) => p.formHref && isOpen(p));
  const shared = PROGRAMS.filter((p) => !p.formHref).map((p) => ({ id: p.id, name: nameOf(p), open: isOpen(p) }));
  const sharedOpen = shared.some((p) => p.open);
  const upcoming = PROGRAMS.filter((p) => p.formHref && p.opens && openState(p) === 'not_yet').sort((a, b) =>
    a.opens!.localeCompare(b.opens!),
  );

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path="/request" lang={lang} />
      <p className="eyebrow">Hearts of Poolville</p>
      <h1 className="h-page">{t.title}</h1>
      <p className="lede small">{t.lede}</p>

      {ownForms.length > 0 && (
        <div className="form">
          <h2 className="h-sm">{t.chooseForm}</h2>
          {ownForms.map((p) => (
            <p key={p.id} className="check">
              <Link href={lang === 'es' ? `${p.formHref}?lang=es` : p.formHref!}>{nameOf(p)} &rarr;</Link>
            </p>
          ))}
        </div>
      )}

      {sharedOpen && (
        <>
          {ownForms.length > 0 && <h2 className="h-sm request-other">{t.otherHelp}</h2>}
          <RequestForm programs={shared} lang={lang} />
        </>
      )}

      {ownForms.length === 0 && !sharedOpen && (
        <div className="panel">
          <p>{t.closed}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="form request-other">
          <h2 className="h-sm">{t.comingUp}</h2>
          {upcoming.map((p) => (
            <p key={p.id} className="check">
              <span>
                {nameOf(p)}
                <em>
                  {' '}
                  &middot; {t.opens} {formatDay(p.opens!, lang)}
                </em>
              </span>
            </p>
          ))}
        </div>
      )}
    </main>
  );
}
