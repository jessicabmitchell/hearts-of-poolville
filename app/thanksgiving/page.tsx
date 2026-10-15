import type { Metadata } from 'next';
import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Thanksgiving dinner application' };

export default async function ThanksgivingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <PublicFormPage slug="thanksgiving" lang={toLang((await searchParams).lang)} />;
}
