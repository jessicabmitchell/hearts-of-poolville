import type { Metadata } from 'next';
import DinnerPage from '@/components/DinnerPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Thanksgiving dinner application' };

export default async function ThanksgivingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <DinnerPage holiday="thanksgiving" lang={toLang((await searchParams).lang)} />;
}
