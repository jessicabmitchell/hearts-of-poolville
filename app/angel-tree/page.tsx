import type { Metadata } from 'next';
import Link from 'next/link';
import LangToggle from '@/components/LangToggle';
import TagForm from '@/components/TagForm';
import { dict, toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Angel Tree tag form' };

export default async function AngelTreePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = toLang((await searchParams).lang);
  const t = dict(lang).tag;

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path="/angel-tree" lang={lang} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="h-page">{t.title}</h1>
      <p className="lede small">{t.lede}</p>
      <TagForm lang={lang} />
      <p className="note">
        {t.needHelp} <Link href={lang === 'es' ? '/angel-tree/apply?lang=es' : '/angel-tree/apply'}>{t.needHelpLink}</Link>
      </p>
    </main>
  );
}
