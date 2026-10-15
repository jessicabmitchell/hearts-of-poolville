import type { Metadata } from 'next';
import AngelTreeForm from '@/components/AngelTreeForm';
import LangToggle from '@/components/LangToggle';
import { dict, formatDay, toLang } from '@/lib/i18n';
import { getProgram, openState } from '@/lib/programs';

export const metadata: Metadata = { title: 'Angel Tree application' };

export default async function AngelTreeApplyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = toLang((await searchParams).lang);
  const t = dict(lang).angelApp;
  const program = getProgram('angel_tree');
  const state = openState(program);

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path="/angel-tree/apply" lang={lang} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="h-page">{t.title}</h1>
      <p className="lede small">
        {program.closes && (
          <>
            {t.deadline} <strong>{formatDay(program.closes, lang)}</strong>.{' '}
          </>
        )}
        {t.pickupTbd}
      </p>
      <p className="lede small">
        <strong>{t.oneChild}</strong>
      </p>
      {state === 'open' ? (
        <AngelTreeForm lang={lang} />
      ) : (
        <div className="panel">
          <p>
            {state === 'not_yet' && program.opens
              ? `${dict(lang).common.opensOn} ${formatDay(program.opens, lang)}.`
              : t.closed}
          </p>
        </div>
      )}
    </main>
  );
}
