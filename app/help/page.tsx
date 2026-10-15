import type { Metadata } from 'next';
import HelpForm from '@/components/HelpForm';
import LangToggle from '@/components/LangToggle';
import { dict, toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'I want to help' };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = toLang((await searchParams).lang);
  const t = dict(lang).help;

  return (
    <main className="narrow" lang={lang}>
      <LangToggle path="/help" lang={lang} />
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="h-page">{t.title}</h1>
      <p className="lede small">{t.lede}</p>
      <HelpForm lang={lang} />
    </main>
  );
}
