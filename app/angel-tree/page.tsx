import type { Metadata } from 'next';
import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Angel Tree tag form' };

export default async function AngelTreeTagPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <PublicFormPage slug="tags" lang={toLang((await searchParams).lang)} />;
}
