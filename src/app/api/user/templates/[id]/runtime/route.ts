import { requireAuth } from "@/lib/auth/middleware";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-body-with-limit";
import { TemplateService } from "@/lib/templates";
import {
  getTemplateStudioCurrentDocument,
  getTemplateStudioTemplate,
  getTemplateStudioUserState,
  saveTemplateStudioUserState,
} from "@/services/server/templateStudioPersistenceService";
import {
  pruneStudioRuntimeValuesForDocument,
  reconcileStudioUserRuntimeValues,
} from "@/utils/template-studio/runtime-state";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";
import { stripStudioRuntimeImageValues } from "@/utils/template-studio/runtime-image-strip";
import {
  MAX_RUNTIME_PAYLOAD_BYTES,
  validateStudioRuntimePayloadLimits,
} from "@/utils/template-studio/runtime-payload-limits";
import {
  isStudioRuntimeValuesLike,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";
import { getStudioTemplateKind } from "@/utils/template-studio/template-kind";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import { NextRequest, NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AuthorizedContext = {
  userId: number;
  templateName: string;
  templateKind: "timetable" | "thumbnail";
};

/**
 * Shared gate for both GET and PUT: login -> common entitlement (template_access /
 * template_artists / admin) -> studio engine + published status. Order matters —
 * users without entitlement get a flat 403 before we reveal whether the id exists.
 */
async function authorize(
  request: NextRequest,
  templateId: string,
): Promise<AuthorizedContext | NextResponse> {
  if (!UUID_REGEX.test(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const entitlement = await TemplateService.resolveEntitlement(
    templateId,
    user,
  );
  if (!entitlement.hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await getTemplateStudioTemplate(templateId);
  if (!template || template.status !== "published") {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const userId = Number(user.userId);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  return {
    userId,
    templateName: template.name,
    templateKind: template.templateKind,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;

  try {
    const auth = await authorize(request, templateId);
    if (auth instanceof NextResponse) return auth;

    const documentRecord = await getTemplateStudioCurrentDocument(templateId);
    if (!documentRecord) {
      return NextResponse.json(
        { error: "Published document not found" },
        { status: 404 },
      );
    }

    const requestedKind = request.nextUrl.searchParams.get("kind");
    if (
      requestedKind &&
      requestedKind !== "thumbnail" &&
      requestedKind !== "timetable"
    ) {
      return NextResponse.json(
        { error: "Invalid template kind" },
        { status: 400 },
      );
    }
    if (requestedKind && auth.templateKind !== requestedKind) {
      return NextResponse.json(
        { error: "Template kind mismatch" },
        { status: 404 },
      );
    }
    if (!requestedKind && auth.templateKind === "thumbnail") {
      return NextResponse.json(
        { error: "Thumbnail runtime requires the thumbnail route" },
        { status: 404 },
      );
    }

    const documentKind = getStudioTemplateKind(documentRecord.document);
    if (requestedKind && documentKind !== requestedKind) {
      return NextResponse.json(
        { error: "Template kind mismatch" },
        { status: 404 },
      );
    }
    if (
      requestedKind === "thumbnail" &&
      documentRecord.publishedRevisionNo === null
    ) {
      return NextResponse.json(
        { error: "Published revision not found" },
        { status: 404 },
      );
    }
    if (
      requestedKind === "thumbnail" &&
      validateStudioDocument(documentRecord.document).some(
        (diagnostic) => diagnostic.severity === "error",
      )
    ) {
      return NextResponse.json(
        { error: "Published thumbnail document is invalid" },
        { status: 422 },
      );
    }

    const isThumbnailRuntime = requestedKind === "thumbnail";
    const state = isThumbnailRuntime
      ? null
      : await getTemplateStudioUserState(templateId, auth.userId);
    const reconciled = isThumbnailRuntime
      ? {
          runtimeValues: createStudioInitialRuntimeValues(
            documentRecord.document,
          ),
          baseRevisionNo: documentRecord.publishedRevisionNo,
          changed: false,
        }
      : reconcileStudioUserRuntimeValues(
          documentRecord.document,
          state
            ? {
                runtimeValues: state.runtimeValues,
                baseRevisionNo: state.baseRevisionNo,
              }
            : null,
          documentRecord.publishedRevisionNo,
        );

    // Only user id from the token is ever written; body/query user ids are never trusted.
    let runtimeValues = reconciled.runtimeValues;
    let shouldPersist = reconciled.changed;

    // Runtime images live only in the browser's IndexedDB — legacy saved
    // state may still carry Data URIs from before this migration, so strip
    // them from every response and persist the cleanup once.
    const stripped = stripStudioRuntimeImageValues(
      documentRecord.document,
      runtimeValues,
    );
    runtimeValues = stripped.values;
    shouldPersist = shouldPersist || stripped.changed;

    if (shouldPersist && state && !isThumbnailRuntime) {
      const saved = await saveTemplateStudioUserState({
        templateId,
        userId: auth.userId,
        runtimeValues,
        baseRevisionNo: reconciled.baseRevisionNo,
      });
      runtimeValues = saved.runtimeValues;
    }

    return NextResponse.json({
      template: {
        id: templateId,
        name: auth.templateName,
        ...(documentKind ? { kind: documentKind } : {}),
      },
      kind: documentKind,
      revisionNo: documentRecord.publishedRevisionNo,
      document: documentRecord.document,
      runtimeValues,
      baseRevisionNo: reconciled.baseRevisionNo,
      hasSavedState: Boolean(state),
      // Stable identity for this browser's local (IndexedDB) runtime image storage.
      storageOwnerId: String(auth.userId),
    });
  } catch (error) {
    console.error("Template Studio runtime fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;

  try {
    const auth = await authorize(request, templateId);
    if (auth instanceof NextResponse) return auth;

    const bodyResult = await readJsonBodyWithLimit(
      request,
      MAX_RUNTIME_PAYLOAD_BYTES,
    );
    if (!bodyResult.ok) {
      if (bodyResult.reason === "too_large") {
        return NextResponse.json(
          { error: "Request payload too large" },
          { status: 413 },
        );
      }
      return NextResponse.json(
        { error: "Invalid runtimeValues payload" },
        { status: 400 },
      );
    }

    const body = bodyResult.data as { runtimeValues?: unknown } | null;
    if (!isStudioRuntimeValuesLike(body?.runtimeValues)) {
      return NextResponse.json(
        { error: "Invalid runtimeValues payload" },
        { status: 400 },
      );
    }

    const documentRecord = await getTemplateStudioCurrentDocument(templateId);
    if (!documentRecord) {
      return NextResponse.json(
        { error: "Published document not found" },
        { status: 404 },
      );
    }

    if (auth.templateKind === "thumbnail") {
      return NextResponse.json(
        { error: "Thumbnail runtime values are browser-local" },
        { status: 405 },
      );
    }

    // Defense in depth: strip image-input values before pruning/validation
    // even though up-to-date clients never send them (images stay local to
    // the browser's IndexedDB, see runtime-image-strip.ts).
    const { values: imagesStripped } = stripStudioRuntimeImageValues(
      documentRecord.document,
      body.runtimeValues,
    );

    const pruned = pruneStudioRuntimeValuesForDocument(
      documentRecord.document,
      imagesStripped,
    );
    const diagnostics = [
      ...validateStudioRuntimeValuesForDocument(
        documentRecord.document,
        pruned,
      ),
      ...validateStudioRuntimePayloadLimits(documentRecord.document, pruned),
    ];
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return NextResponse.json(
        { error: "runtimeValues failed validation", diagnostics },
        { status: 400 },
      );
    }

    const saved = await saveTemplateStudioUserState({
      templateId,
      userId: auth.userId,
      runtimeValues: pruned,
      baseRevisionNo: documentRecord.publishedRevisionNo,
    });

    return NextResponse.json({
      runtimeValues: saved.runtimeValues,
      baseRevisionNo: saved.baseRevisionNo,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error("Template Studio runtime save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
