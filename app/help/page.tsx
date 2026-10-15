import type { Metadata } from 'next';
import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'I want to help' };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <PublicFormPage slug="help" lang={toLang((await searchParams).lang)} />;
}
