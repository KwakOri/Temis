import { requireAuth } from "@/lib/auth/middleware";
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
import { validateStudioRuntimePayloadLimits } from "@/utils/template-studio/runtime-payload-limits";
import {
  isStudioRuntimeValuesLike,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";
import { NextRequest, NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AuthorizedContext = {
  userId: number;
  templateName: string;
};

/**
 * Shared gate for both GET and PUT: login -> common entitlement (template_access /
 * template_artists / admin) -> studio engine + published status. Order matters —
 * users without entitlement get a flat 403 before we reveal whether the id exists.
 */
async function authorize(
  request: NextRequest,
  templateId: string
): Promise<AuthorizedContext | NextResponse> {
  if (!UUID_REGEX.test(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const entitlement = await TemplateService.resolveEntitlement(
    templateId,
    user
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

  return { userId, templateName: template.name };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;

  try {
    const auth = await authorize(request, templateId);
    if (auth instanceof NextResponse) return auth;

    const documentRecord = await getTemplateStudioCurrentDocument(templateId);
    if (!documentRecord) {
      return NextResponse.json(
        { error: "Published document not found" },
        { status: 404 }
      );
    }

    const state = await getTemplateStudioUserState(templateId, auth.userId);
    const reconciled = reconcileStudioUserRuntimeValues(
      documentRecord.document,
      state
        ? {
            runtimeValues: state.runtimeValues,
            baseRevisionNo: state.baseRevisionNo,
          }
        : null,
      documentRecord.publishedRevisionNo
    );

    // Only user id from the token is ever written; body/query user ids are never trusted.
    let runtimeValues = reconciled.runtimeValues;
    if (reconciled.changed && state) {
      const saved = await saveTemplateStudioUserState({
        templateId,
        userId: auth.userId,
        runtimeValues: reconciled.runtimeValues,
        baseRevisionNo: reconciled.baseRevisionNo,
      });
      runtimeValues = saved.runtimeValues;
    }

    return NextResponse.json({
      template: { id: templateId, name: auth.templateName },
      document: documentRecord.document,
      runtimeValues,
      baseRevisionNo: reconciled.baseRevisionNo,
      hasSavedState: Boolean(state),
    });
  } catch (error) {
    console.error("Template Studio runtime fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;

  try {
    const auth = await authorize(request, templateId);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => null);
    if (!isStudioRuntimeValuesLike(body?.runtimeValues)) {
      return NextResponse.json(
        { error: "Invalid runtimeValues payload" },
        { status: 400 }
      );
    }

    const documentRecord = await getTemplateStudioCurrentDocument(templateId);
    if (!documentRecord) {
      return NextResponse.json(
        { error: "Published document not found" },
        { status: 404 }
      );
    }

    const pruned = pruneStudioRuntimeValuesForDocument(
      documentRecord.document,
      body.runtimeValues
    );
    const diagnostics = [
      ...validateStudioRuntimeValuesForDocument(documentRecord.document, pruned),
      ...validateStudioRuntimePayloadLimits(documentRecord.document, pruned),
    ];
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return NextResponse.json(
        { error: "runtimeValues failed validation", diagnostics },
        { status: 400 }
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
      { status: 500 }
    );
  }
}
