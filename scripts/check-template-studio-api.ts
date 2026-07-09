import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { deleteTemplateStudioTemplate } from "../src/services/server/templateStudioPersistenceService";
import { deleteFilesFromR2 } from "../src/lib/r2";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const LOCAL_ADMIN_USER_ID = 9000001;
const LOCAL_ADMIN_EMAIL = "admin@temis.com";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

type SmokeRequestInit = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run Template Studio API check against a non-local Supabase URL.",
    );
  }
};

const ensureLocalAdminUser = async () => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id: LOCAL_ADMIN_USER_ID,
      created_at: now,
      updated_at: now,
      name: "Template Studio Local Admin",
      email: LOCAL_ADMIN_EMAIL,
      password: "local-only",
      role: "admin",
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }
};

const createRequest = (
  url: string,
  token: string,
  init: SmokeRequestInit = {},
): NextRequest =>
  new NextRequest(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

const parseRouteResponse = async <T>(
  response: NextResponse,
  label: string,
): Promise<T> => {
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${label} failed ${response.status}: ${
        result && typeof result === "object" && "error" in result
          ? String((result as { error?: unknown }).error)
          : response.statusText
      }`,
    );
  }

  return result as T;
};

const callRoute = async <T>(
  label: string,
  handler: RouteHandler | ((request: NextRequest) => Promise<NextResponse>),
  request: NextRequest,
  context?: RouteContext,
): Promise<T> => {
  const response = context
    ? await (handler as RouteHandler)(request, context)
    : await (handler as (request: NextRequest) => Promise<NextResponse>)(request);

  return parseRouteResponse<T>(response, label);
};

const main = async () => {
  assertLocalSupabaseUrl();
  await ensureLocalAdminUser();

  const uploadedR2Keys: string[] = [];
  const [
    templateRoutes,
    templateDetailRoutes,
    assetUploadRoutes,
    draftRoutes,
    publishRoutes,
  ] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/route"),
    import(
      "../src/app/api/admin/template-studio/templates/[id]/assets/upload/route"
    ),
    import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
  ]);

  const token = await signJWT(
    {
      userId: LOCAL_ADMIN_USER_ID,
      email: LOCAL_ADMIN_EMAIL,
      role: "admin",
    },
    "1h",
  );
  const routeBaseUrl = "http://127.0.0.1/template-studio-api-check";

  let templateId: string | null = null;

  try {
    const createResponse = await callRoute<{
      success: boolean;
      template: { id: string; status: string };
    }>(
      "create template",
      templateRoutes.POST,
      createRequest(`${routeBaseUrl}/api/admin/template-studio/templates`, token, {
        method: "POST",
        body: JSON.stringify({
          name: "Template Studio API Check",
          description: "Local API verification only.",
        }),
      }),
    );
    assert(createResponse.success, "Template create response was not success.");
    assert(createResponse.template.id, "Template create response missed id.");
    templateId = createResponse.template.id;

    const listResponse = await callRoute<{
      success: boolean;
      templates: Array<{ id: string }>;
    }>(
      "list templates",
      templateRoutes.GET,
      createRequest(`${routeBaseUrl}/api/admin/template-studio/templates`, token),
    );
    assert(
      listResponse.templates.some((template) => template.id === templateId),
      "Template list did not include created template.",
    );

    const context = {
      params: Promise.resolve({ id: templateId }),
    };
    const emptyDetailResponse = await callRoute<{
      success: boolean;
      source: string;
      latestRevisionNo: number;
    }>(
      "load empty template",
      templateDetailRoutes.GET,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}`,
        token,
      ),
      context,
    );
    assert(emptyDetailResponse.source === "empty", "Initial source should be empty.");
    assert(
      emptyDetailResponse.latestRevisionNo === 0,
      "Initial revision should be zero.",
    );

    const document = createSampleStudioDocument();
    document.metadata.name = "Template Studio API Check";
    const runtimeValues = createInitialStudioRuntimeValues(document);

    const uploadResponse = await callRoute<{
      success: boolean;
      assets: Array<{
        id: string;
        src: string;
        storageProvider: string;
        storagePath: string;
        publicUrl: string;
        contentHash: string;
        mimeType: string;
        byteSize: number;
        uploaded: boolean;
      }>;
    }>(
      "upload assets",
      assetUploadRoutes.POST,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/assets/upload`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            assets: Object.values(document.assets).map((asset) => ({
              assetId: asset.id,
              label: asset.label,
              src: asset.src,
            })),
          }),
        },
      ),
      context,
    );
    assert(uploadResponse.success, "Asset upload response was not success.");
    assert(
      uploadResponse.assets.length === Object.keys(document.assets).length,
      "Asset upload response did not include every document asset.",
    );

    const uploadedAssetsById = new Map(
      uploadResponse.assets.map((asset) => [asset.id, asset]),
    );
    Object.keys(document.assets).forEach((assetId) => {
      const uploadedAsset = uploadedAssetsById.get(assetId);
      assert(uploadedAsset, `Uploaded asset missing for ${assetId}.`);
      uploadedR2Keys.push(uploadedAsset.storagePath);
      document.assets[assetId] = {
        ...document.assets[assetId],
        src: uploadedAsset.src,
        storageProvider: uploadedAsset.storageProvider,
        storagePath: uploadedAsset.storagePath,
        publicUrl: uploadedAsset.publicUrl,
        contentHash: uploadedAsset.contentHash,
        mimeType: uploadedAsset.mimeType,
        byteSize: uploadedAsset.byteSize,
      };
    });

    const draftResponse = await callRoute<{
      success: boolean;
      hasDraft: boolean;
      draft: { templateId: string } | null;
    }>(
      "save draft",
      draftRoutes.PUT,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/draft`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            document,
            runtimeValues,
            isAutosave: true,
          }),
        },
      ),
      context,
    );
    assert(draftResponse.hasDraft, "Draft save response missed draft.");
    assert(
      draftResponse.draft?.templateId === templateId,
      "Draft template id mismatch.",
    );

    const fetchedDraftResponse = await callRoute<{
      success: boolean;
      hasDraft: boolean;
    }>(
      "load draft",
      draftRoutes.GET,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/draft`,
        token,
      ),
      context,
    );
    assert(fetchedDraftResponse.hasDraft, "Draft fetch did not find draft.");

    const publishResponse = await callRoute<{
      success: boolean;
      revisionNo: number;
      latestRevisionNo: number;
      document: { templateId: string; publishedRevisionNo: number | null };
    }>(
      "publish document",
      publishRoutes.POST,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/publish`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            document,
            runtimeValues,
          }),
        },
      ),
      context,
    );
    assert(publishResponse.revisionNo === 1, "Publish should create revision 1.");
    assert(
      publishResponse.document.publishedRevisionNo === 1,
      "Published document should point at revision 1.",
    );

    const publishedDetailResponse = await callRoute<{
      success: boolean;
      assets: Array<{ assetId: string; storageProvider: string | null }>;
      source: string;
      latestRevisionNo: number;
    }>(
      "load published template",
      templateDetailRoutes.GET,
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}`,
        token,
      ),
      context,
    );
    assert(
      publishedDetailResponse.source === "published",
      "Detail source should be published after publish.",
    );
    assert(
      publishedDetailResponse.latestRevisionNo === 1,
      "Detail latest revision should be one.",
    );
    assert(
      publishedDetailResponse.assets.length === Object.keys(document.assets).length,
      "Detail response should include asset metadata.",
    );
    assert(
      publishedDetailResponse.assets.every(
        (asset) => asset.storageProvider === "r2",
      ),
      "Detail asset metadata should use r2 provider.",
    );

    console.log("Template Studio API route smoke check passed.");
  } finally {
    if (uploadedR2Keys.length > 0) {
      await deleteFilesFromR2(uploadedR2Keys).catch((error) => {
        console.warn("Failed to cleanup Template Studio API check R2 keys.", error);
      });
    }

    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
