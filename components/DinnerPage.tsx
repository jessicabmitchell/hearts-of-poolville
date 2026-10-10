import DinnerForm from '@/components/DinnerForm';
import LangToggle from '@/components/LangToggle';
import { dict, formatDay, type Lang } from '@/lib/i18n';
import { DINNER_PICKUP, getProgram, openState, type Holiday } from '@/lib/programs';

/** The Thanksgiving and Christmas dinner applications. They ask the same questions. */
export default function DinnerPage({ holiday, lang }: { holiday: Holiday; lang: Lang }) {
  const h = dict(lang).holidays[holiday];
  const program = getProgram(holiday);
  const state = openState(program);
  const pickupDay = formatDay(DINNER_PICKUP[holiday], lang);

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path={`/${holiday}`} lang={lang} />
      <p className="eyebrow">{h.eyebrow}</p>
      <h1 className="h-page">{h.title}</h1>
      <p className="lede small">
        {program.closes && (
          <>
            {h.deadline} <strong>{formatDay(program.closes, lang)}</strong>.{' '}
          </>
        )}
        {h.pickup} <strong>{pickupDay}</strong>.
        {h.angelTree && ` ${h.angelTree} ${pickupDay}.`}
      </p>
      {state === 'open' ? (
        <DinnerForm holiday={holiday} lang={lang} pickupDay={pickupDay} />
      ) : (
        <div className="panel">
          <p>
            {state === 'not_yet' && program.opens
              ? `${dict(lang).common.opensOn} ${formatDay(program.opens, lang)}.`
              : h.closed}
          </p>
        </div>
      )}
    </main>
  );
}
