import type { Metadata } from 'next';
import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Angel Tree application' };

export default async function AngelTreeApplyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <PublicFormPage slug="angel_tree" lang={toLang((await searchParams).lang)} />;
}
