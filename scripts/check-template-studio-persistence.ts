import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import {
  createTemplateStudioTemplate,
  deleteTemplateStudioAssetMetadata,
  deleteTemplateStudioTemplate,
  getTemplateStudioCurrentDocument,
  getTemplateStudioDraft,
  getTemplateStudioLatestRevisionNo,
  getTemplateStudioTemplate,
  listTemplateStudioRevisions,
  publishTemplateStudioDocument,
  saveTemplateStudioDraft,
  upsertTemplateStudioAssetMetadata,
  validateTemplateStudioDocumentForPersistence,
} from "../src/services/server/templateStudioPersistenceService";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const LOCAL_ADMIN_USER_ID = 9000001;
const LOCAL_ADMIN_EMAIL = "admin@temis.com";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";

  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run Template Studio persistence check against a non-local Supabase URL.",
    );
  }
};

const ensureLocalAdminUser = async () => {
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id: LOCAL_ADMIN_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

const main = async () => {
  assertLocalSupabaseUrl();
  await ensureLocalAdminUser();

  const document = createSampleStudioDocument();
  document.metadata.name = "Template Studio Persistence Check";
  const runtimeValues = createInitialStudioRuntimeValues(document);
  const prepared = validateTemplateStudioDocumentForPersistence(
    document,
    runtimeValues,
  );
  assert(prepared.ok, prepared.ok ? "" : prepared.message);

  let templateId: string | null = null;

  try {
    const template = await createTemplateStudioTemplate({
      name: "Template Studio Persistence Check",
      description: "Local helper verification only.",
      createdBy: LOCAL_ADMIN_USER_ID,
    });
    templateId = template.id;
    assert(template.status === "draft", "Template should start as draft.");

    const fetchedTemplate = await getTemplateStudioTemplate(template.id);
    assert(fetchedTemplate?.id === template.id, "Template fetch failed.");

    const initialRevisionNo = await getTemplateStudioLatestRevisionNo(
      template.id,
    );
    assert(initialRevisionNo === 0, "Initial revision number should be zero.");

    const draft = await saveTemplateStudioDraft({
      templateId: template.id,
      userId: LOCAL_ADMIN_USER_ID,
      document,
      runtimeValues,
      isAutosave: true,
    });
    assert(draft.templateId === template.id, "Draft template id mismatch.");

    const fetchedDraft = await getTemplateStudioDraft(
      template.id,
      LOCAL_ADMIN_USER_ID,
    );
    assert(fetchedDraft?.id === draft.id, "Draft fetch failed.");

    const published = await publishTemplateStudioDocument({
      templateId: template.id,
      userId: LOCAL_ADMIN_USER_ID,
      document,
      runtimeValues,
      deleteDraft: true,
    });
    assert(published.revisionNo === 1, "First publish should create revision 1.");
    assert(
      published.document.publishedRevisionNo === 1,
      "Published document should point at revision 1.",
    );

    const currentDocument = await getTemplateStudioCurrentDocument(template.id);
    assert(currentDocument?.templateId === template.id, "Document fetch failed.");

    const latestRevisionNo = await getTemplateStudioLatestRevisionNo(template.id);
    assert(latestRevisionNo === 1, "Latest revision number should be one.");

    const revisions = await listTemplateStudioRevisions(template.id);
    assert(revisions.length === 1, "Expected one revision after first publish.");

    const draftAfterPublish = await getTemplateStudioDraft(
      template.id,
      LOCAL_ADMIN_USER_ID,
    );
    assert(draftAfterPublish === null, "Draft should be deleted after publish.");

    const asset = await upsertTemplateStudioAssetMetadata({
      templateId: template.id,
      assetId: "local-check-profile",
      storageProvider: "r2",
      storagePath: `template-studio/${template.id}/assets/local-check-profile/profile.png`,
      publicUrl: `https://example.com/template-studio/${template.id}/assets/local-check-profile/profile.png`,
      contentHash: "local-check-content-hash",
      mimeType: "image/png",
      width: 1,
      height: 1,
      byteSize: 68,
      createdBy: LOCAL_ADMIN_USER_ID,
      lastSyncedAt: new Date().toISOString(),
    });
    assert(asset.assetId === "local-check-profile", "Asset upsert failed.");
    assert(asset.storageProvider === "r2", "Asset provider should be r2.");
    assert(
      asset.contentHash === "local-check-content-hash",
      "Asset content hash should round-trip.",
    );

    await deleteTemplateStudioAssetMetadata(template.id, asset.assetId);

    await deleteTemplateStudioTemplate(template.id);
    templateId = null;

    const deletedTemplate = await getTemplateStudioTemplate(template.id);
    assert(deletedTemplate === null, "Template cleanup failed.");

    console.log("Template Studio persistence helper check passed.");
  } finally {
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
