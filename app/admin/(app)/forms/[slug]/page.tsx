import { notFound } from 'next/navigation';
import FormEditor from '@/components/admin/FormEditor';
import { formPath } from '@/lib/forms/defaults';
import { getForm, getVersions } from '@/lib/forms/store';
import { requireAdmin } from '@/lib/auth';

export default async function EditFormPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const form = await getForm(slug);
  if (!form || form.config.archived) notFound();
  const versions = await getVersions(slug);

  return (
    <FormEditor
      // A fresh editor after each save, so it starts from what was saved.
      key={form.updatedAt ?? 'new'}
      slug={slug}
      initial={form.config}
      publicPath={formPath(slug)}
      updatedAt={form.updatedAt}
      updatedBy={form.updatedBy}
      versions={versions}
    />
  );
}
