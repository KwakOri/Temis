import type {
  V2TemplateCardNodeBinding,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateNodeBindingRef,
} from "@/types/time-table/template-render-config";

export interface V2NodeNewFieldDraft {
  key: string;
  scope: V2TemplateFieldScope;
}

const v2_DEFAULT_NEW_FIELD_DRAFT: V2NodeNewFieldDraft = {
  key: "",
  scope: "entry",
};

export const v2_getNodeBindingSelectValue = (
  binding: V2TemplateNodeBindingRef
): string => {
  if (binding.mode === "field") {
    return `field:${binding.scope}:${binding.key}`;
  }
  if (binding.mode === "computed") {
    return `computed:${binding.key}`;
  }
  return "literal";
};

export const v2_getNodeFieldBinding = (binding: V2TemplateNodeBindingRef) => {
  return binding.mode === "field" ? binding : null;
};

export const v2_hasNodeBindingField = (
  binding: V2TemplateNodeBindingRef,
  fields: V2TemplateFormField[]
): boolean => {
  const fieldBinding = v2_getNodeFieldBinding(binding);
  if (!fieldBinding) return true;

  return fields.some(
    (field) =>
      field.scope === fieldBinding.scope && field.key === fieldBinding.key
  );
};

export const v2_getNodeNewFieldDraft = (
  draftMap: Record<string, V2NodeNewFieldDraft>,
  nodeId: string
): V2NodeNewFieldDraft => {
  return draftMap[nodeId] ?? v2_DEFAULT_NEW_FIELD_DRAFT;
};

export const v2_bindingToLiteralText = (
  binding: V2TemplateNodeBindingRef
): string => {
  if (binding.mode === "literal") return binding.value;
  if (binding.mode === "field") return binding.key;
  return binding.key;
};

export const v2_parseNodeBindingFromSelectValue = (
  value: string,
  currentBinding: V2TemplateCardNodeBinding
): V2TemplateCardNodeBinding | null => {
  if (value === "literal") {
    return {
      mode: "literal",
      value: v2_bindingToLiteralText(currentBinding),
    };
  }

  if (value.startsWith("computed:")) {
    const computedKey = value.replace("computed:", "");
    if (
      computedKey === "streamingDay" ||
      computedKey === "streamingDate" ||
      computedKey === "streamingTime"
    ) {
      return {
        mode: "computed",
        key: computedKey,
      };
    }
    return null;
  }

  if (value.startsWith("field:")) {
    const [, scope, ...rest] = value.split(":");
    const key = rest.join(":");
    if (!key) return null;
    if (scope !== "entry" && scope !== "card" && scope !== "global") {
      return null;
    }
    return {
      mode: "field",
      scope,
      key,
    };
  }

  return null;
};
