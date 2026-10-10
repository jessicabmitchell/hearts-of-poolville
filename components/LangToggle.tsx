import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';

/** English/Spanish switch for a form page. The Spanish link (?lang=es) can be shared directly. */
export default function LangToggle({ path, lang }: { path: string; lang: Lang }) {
  const other: Lang = lang === 'es' ? 'en' : 'es';
  const t = dict(lang);
  return (
    <p className="lang">
      <Link
        className="chip"
        href={other === 'es' ? `${path}?lang=es` : path}
        hrefLang={other}
        lang={other}
        aria-label={t.switchLabel}
        replace
      >
        {t.switchTo}
      </Link>
    </p>
  );
}
