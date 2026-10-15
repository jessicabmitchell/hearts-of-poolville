import type { Metadata } from 'next';
import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Christmas dinner application' };

export default async function ChristmasPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <PublicFormPage slug="christmas" lang={toLang((await searchParams).lang)} />;
}
