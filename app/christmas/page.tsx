import type { Metadata } from 'next';
import DinnerPage from '@/components/DinnerPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Christmas dinner application' };

export default async function ChristmasPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <DinnerPage holiday="christmas" lang={toLang((await searchParams).lang)} />;
}
