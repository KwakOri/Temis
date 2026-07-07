import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type TemplateStudioPreviewRedirectSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function TemplateStudioDraftPreviewRedirectPage({
  searchParams,
}: {
  searchParams?: TemplateStudioPreviewRedirectSearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const previewKeyParam = params.previewKey;
  const previewKey = Array.isArray(previewKeyParam)
    ? previewKeyParam[0]
    : previewKeyParam;

  redirect(
    previewKey
      ? `/admin/template-studio/preview?previewKey=${encodeURIComponent(
          previewKey,
        )}`
      : "/admin/template-studio/preview",
  );
}
