import type {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

// Total serialized runtime_values JSON stored per user per template.
export const MAX_RUNTIME_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB
// Fallback cap for text/select inputs that don't declare their own maxLength.
const DEFAULT_TEXT_INPUT_MAX_LENGTH = 2000;
// Base64 data URI image values (profile photos etc. uploaded via FileReader).
const MAX_IMAGE_DATA_URI_BYTES = 4 * 1024 * 1024; // ~4MB decoded
const ALLOWED_IMAGE_DATA_URI_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_ENTRY_MAIN_TITLE_LENGTH = 500;
const MAX_ENTRY_SUB_TITLE_LENGTH = 200;
const MAX_OFFLINE_MEMO_LENGTH = 1000;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

const estimateDataUriDecodedBytes = (dataUri: string): number => {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
};

const checkImageValue = (
  inputId: string,
  value: string,
  diagnostics: StudioDiagnostic[]
): void => {
  if (!value) return;

  if (!value.startsWith("data:")) {
    // Non-data-URI image values (e.g. already-hosted URLs) are not size-checked here.
    return;
  }

  const mimeMatch = /^data:([^;,]+)/.exec(value);
  const mime = mimeMatch?.[1];
  if (!mime || !ALLOWED_IMAGE_DATA_URI_MIME_TYPES.has(mime)) {
    diagnostics.push({
      id: `runtime-image-mime:${inputId}`,
      severity: "error",
      title: "Unsupported image type",
      detail: `${inputId} has an unsupported or missing image MIME type (${mime ?? "unknown"}).`,
    });
    return;
  }

  if (estimateDataUriDecodedBytes(value) > MAX_IMAGE_DATA_URI_BYTES) {
    diagnostics.push({
      id: `runtime-image-too-large:${inputId}`,
      severity: "error",
      title: "Image too large",
      detail: `${inputId} exceeds the ${MAX_IMAGE_DATA_URI_BYTES} byte image size limit.`,
    });
  }
};

const checkTextValue = (
  inputId: string,
  value: string,
  maxLength: number | undefined,
  diagnostics: StudioDiagnostic[]
): void => {
  const limit = maxLength ?? DEFAULT_TEXT_INPUT_MAX_LENGTH;
  if (value.length > limit) {
    diagnostics.push({
      id: `runtime-text-too-long:${inputId}`,
      severity: "error",
      title: "Text value too long",
      detail: `${inputId} is ${value.length} characters, exceeding the ${limit} character limit.`,
    });
  }
};

const checkInputValue = (
  document: StudioTemplateDocument,
  inputId: string,
  value: string,
  diagnostics: StudioDiagnostic[]
): void => {
  if (typeof value !== "string") {
    diagnostics.push({
      id: `runtime-value-not-string:${inputId}`,
      severity: "error",
      title: "Invalid value type",
      detail: `${inputId} must be a string.`,
    });
    return;
  }

  const input = document.inputs[inputId];
  if (input?.type === "image") {
    checkImageValue(inputId, value, diagnostics);
    return;
  }

  const maxLength = input?.type === "text" ? input.maxLength : undefined;
  checkTextValue(inputId, value, maxLength, diagnostics);
};

/**
 * Server-side ceiling on what a user's Studio runtime state can contain:
 * per-input string/image limits derived from the document's own input
 * contract, plus a hard cap on the total serialized payload so a handful of
 * users can't inflate template_studio_user_states with unbounded JSON.
 */
export const validateStudioRuntimePayloadLimits = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];

  const totalBytes = byteLength(JSON.stringify(values));
  if (totalBytes > MAX_RUNTIME_PAYLOAD_BYTES) {
    diagnostics.push({
      id: "runtime-payload-too-large",
      severity: "error",
      title: "Runtime payload too large",
      detail: `Serialized runtime values are ${totalBytes} bytes, exceeding the ${MAX_RUNTIME_PAYLOAD_BYTES} byte limit.`,
    });
  }

  Object.entries(values.global ?? {}).forEach(([inputId, value]) =>
    checkInputValue(document, inputId, value, diagnostics)
  );
  Object.values(values.days ?? {}).forEach((dayValues) =>
    Object.entries(dayValues ?? {}).forEach(([inputId, value]) =>
      checkInputValue(document, inputId, value, diagnostics)
    )
  );
  Object.values(values.entries ?? {}).forEach((entryList) =>
    (entryList ?? []).forEach((entry) =>
      Object.entries(entry ?? {}).forEach(([inputId, value]) =>
        checkInputValue(document, inputId, value, diagnostics)
      )
    )
  );

  Object.entries(values.timetable?.entriesByDay ?? {}).forEach(([dayId, entries]) => {
    (entries ?? []).forEach((entry, index) => {
      if ((entry.mainTitle?.length ?? 0) > MAX_ENTRY_MAIN_TITLE_LENGTH) {
        diagnostics.push({
          id: `runtime-main-title-too-long:${dayId}:${index}`,
          severity: "error",
          title: "Main title too long",
          detail: `${dayId} entry ${index} mainTitle exceeds ${MAX_ENTRY_MAIN_TITLE_LENGTH} characters.`,
        });
      }
      if ((entry.subTitle?.length ?? 0) > MAX_ENTRY_SUB_TITLE_LENGTH) {
        diagnostics.push({
          id: `runtime-sub-title-too-long:${dayId}:${index}`,
          severity: "error",
          title: "Sub title too long",
          detail: `${dayId} entry ${index} subTitle exceeds ${MAX_ENTRY_SUB_TITLE_LENGTH} characters.`,
        });
      }
    });
  });

  Object.entries(values.timetable?.offlineMemoByDay ?? {}).forEach(([dayId, memo]) => {
    if ((memo?.length ?? 0) > MAX_OFFLINE_MEMO_LENGTH) {
      diagnostics.push({
        id: `runtime-offline-memo-too-long:${dayId}`,
        severity: "error",
        title: "Offline memo too long",
        detail: `${dayId} offline memo exceeds ${MAX_OFFLINE_MEMO_LENGTH} characters.`,
      });
    }
  });

  return diagnostics;
};
