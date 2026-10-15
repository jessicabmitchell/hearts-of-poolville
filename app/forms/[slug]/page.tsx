import PublicFormPage from '@/components/forms/PublicFormPage';
import { toLang } from '@/lib/i18n';

// Forms added on the admin page.
export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  return <PublicFormPage slug={slug} lang={toLang((await searchParams).lang)} />;
}
