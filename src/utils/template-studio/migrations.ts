import { StudioTemplateDocument } from "@/types/template-studio";
import { ensureStudioTimetableEntryGroupContract } from "@/utils/template-studio/entry-groups";
import {
  ensureStudioTimetableVariantInput,
  isStudioTimetableVariantInputCompatible,
} from "@/utils/template-studio/preset-inputs";
import { ensureStudioStatusCardBackgroundBaseColors } from "@/utils/template-studio/status-card-background";
import { ensureStudioIndependentStatusVariants } from "@/utils/template-studio/status-variants";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import {
  getStudioTemplateKind,
  isStudioTemplateKind,
} from "@/utils/template-studio/template-kind";
import {
  ensureStudioStructuredTextFlexibleKind,
  getStudioTimetableComposition,
} from "@/utils/template-studio/timetable-composition";

export const STUDIO_TEMPLATE_DOCUMENT_SCHEMA = "studio_template_document";
export const STUDIO_TEMPLATE_DOCUMENT_VERSION = 7;

const SUPPORTED_SOURCE_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7]);

export type StudioTemplateDocumentMigrationResult =
  | {
      ok: true;
      document: StudioTemplateDocument;
      warnings: string[];
    }
  | {
      ok: false;
      message: string;
    };

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isStudioTemplateDocumentLike = (
  value: unknown,
): value is StudioTemplateDocument =>
  isRecord(value) &&
  value.schema === STUDIO_TEMPLATE_DOCUMENT_SCHEMA &&
  value.version === STUDIO_TEMPLATE_DOCUMENT_VERSION &&
  isRecord(value.metadata) &&
  isRecord(value.canvas) &&
  isRecord(value.graph) &&
  isRecord(value.inputs) &&
  isRecord(value.styles) &&
  isRecord(value.assets);

export const migrateStudioTemplateDocument = (
  value: unknown,
): StudioTemplateDocumentMigrationResult => {
  if (!isRecord(value)) {
    return {
      ok: false,
      message: "The selected JSON is not an object.",
    };
  }

  if (value.schema !== STUDIO_TEMPLATE_DOCUMENT_SCHEMA) {
    return {
      ok: false,
      message: "The selected JSON is not a Template Studio document.",
    };
  }

  if (
    typeof value.version !== "number" ||
    !SUPPORTED_SOURCE_VERSIONS.has(value.version)
  ) {
    return {
      ok: false,
      message: `Template Studio document version ${String(value.version)} is not supported.`,
    };
  }

  if (
    !isRecord(value.metadata) ||
    !isRecord(value.canvas) ||
    !isRecord(value.graph) ||
    !isRecord(value.inputs) ||
    !isRecord(value.styles) ||
    !isRecord(value.assets)
  ) {
    return {
      ok: false,
      message:
        "The selected Template Studio document is missing required fields.",
    };
  }

  const document = cloneJson(value) as unknown as StudioTemplateDocument;
  const warnings: string[] = [];
  if (value.version !== STUDIO_TEMPLATE_DOCUMENT_VERSION) {
    document.version = STUDIO_TEMPLATE_DOCUMENT_VERSION;
    warnings.push(
      `Migrated Template Studio document from version ${value.version} to version ${STUDIO_TEMPLATE_DOCUMENT_VERSION}.`,
    );
  }

  // v7부터 canonical 문서는 종류를 명시한다. 종류가 없던 문서는 도메인으로
  // 판정하고, 판정할 수 없으면 시간표로 둔다. 기존 문서는 모두 시간표였다.
  if (!isStudioTemplateKind(document.metadata.kind)) {
    const resolvedKind = getStudioTemplateKind(document) ?? "timetable";
    document.metadata.kind = resolvedKind;
    warnings.push(`Recorded template kind ${resolvedKind} on the document.`);
  }

  const timetable = document.domains?.timetable;

  if (timetable) {
    if ((timetable as { version: number }).version !== 2) {
      (timetable as { version: number }).version = 2;
      warnings.push("Migrated timetable domain to version 2.");
    }
    if (!timetable.capabilities) {
      warnings.push("Added default timetable capabilities.");
    }
    timetable.capabilities = getStudioTimetableCapabilities(timetable);
    Object.entries(timetable.capabilities).forEach(
      ([capabilityKey, capability]) => {
        if (!capability.enabled) return;
        if (
          ensureStudioTimetableCapabilityStatus(
            timetable,
            capabilityKey as keyof typeof timetable.capabilities,
          )
        ) {
          warnings.push(`Added ${capabilityKey} timetable status.`);
        }
      },
    );

    if (!timetable.composition) {
      warnings.push("Added default timetable composition.");
    }
    timetable.composition = getStudioTimetableComposition(timetable);
    warnings.push(
      ...ensureStudioStructuredTextFlexibleKind(timetable.composition),
    );
    warnings.push(...ensureStudioTimetableEntryGroupContract(document));
    warnings.push(...ensureStudioIndependentStatusVariants(document));
    if (typeof value.version === "number" && value.version < 6) {
      warnings.push(...ensureStudioStatusCardBackgroundBaseColors(document));
    }

    Object.values(timetable.composition.objects).forEach((object) => {
      if (
        !object.variantSet ||
        (object.presetId !== "weeklyMemo" &&
          object.presetId !== "artistProfileText" &&
          object.presetId !== "topObject")
      ) {
        return;
      }

      if (
        isStudioTimetableVariantInputCompatible(
          document,
          object.variantSet.inputId,
        )
      ) {
        return;
      }

      const variantInput = ensureStudioTimetableVariantInput(
        document,
        object.presetId,
      );
      if (!variantInput) return;

      object.variantSet.inputId = variantInput.inputId;
      if (variantInput.created) {
        warnings.push(`Added ${object.label} state input.`);
      }
    });
  }

  return {
    ok: true,
    document,
    warnings,
  };
};
