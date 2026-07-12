import { StudioTemplateDocument } from "@/types/template-studio";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import { getStudioTimetableComposition } from "@/utils/template-studio/timetable-composition";
import {
  ensureStudioTimetableVariantInput,
  isStudioTimetableVariantInputCompatible,
} from "@/utils/template-studio/preset-inputs";
import { ensureStudioTimetableEntryGroupContract } from "@/utils/template-studio/entry-groups";

export const STUDIO_TEMPLATE_DOCUMENT_SCHEMA = "studio_template_document";
export const STUDIO_TEMPLATE_DOCUMENT_VERSION = 2;

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
    value.version !== 1 &&
    value.version !== STUDIO_TEMPLATE_DOCUMENT_VERSION
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
  if (value.version === 1) {
    document.version = STUDIO_TEMPLATE_DOCUMENT_VERSION;
    warnings.push(
      "Migrated Template Studio document from version 1 to version 2.",
    );
  }
  const timetable = document.domains?.timetable;

  if (timetable) {
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
    warnings.push(...ensureStudioTimetableEntryGroupContract(document));

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
