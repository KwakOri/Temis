import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TemplateStudioPublishedPreviewRedirectPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  redirect(`/admin/template-studio/${templateId}/preview`);
}
