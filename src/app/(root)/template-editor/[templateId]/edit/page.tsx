import { redirect } from 'next/navigation';

const LegacyTemplateEditorEditPage = async ({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) => {
  const { templateId } = await params;
  redirect(`/admin/template-editor/${templateId}/edit`);
};

export default LegacyTemplateEditorEditPage;
