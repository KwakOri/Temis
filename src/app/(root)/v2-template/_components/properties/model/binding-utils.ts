import {
  v2_TEMPLATE_COMPUTED_BINDING_KEYS,
  type V2TemplateCardNodeBinding,
  type V2TemplateFieldScope,
  type V2TemplateFormField,
  type V2TemplateNodeBindingRef,
} from "@/types/time-table/template-render-config";

const v2_COMPUTED_KEY_SET = new Set<string>(v2_TEMPLATE_COMPUTED_BINDING_KEYS);

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

export const v2_getNodeBindingLabel = (
  binding: V2TemplateNodeBindingRef,
  fields: V2TemplateFormField[] = []
): string => {
  if (binding.mode === "computed") {
    return `computed / ${binding.key}`;
  }

  if (binding.mode === "field") {
    const exists = fields.some(
      (field) => field.scope === binding.scope && field.key === binding.key
    );
    const entryIndexSuffix =
      binding.scope === "entry" && binding.entrySelector?.mode === "index"
        ? ` [entry ${binding.entrySelector.index + 1}]`
        : "";
    return `field / ${binding.scope}.${binding.key}${entryIndexSuffix}${
      exists ? "" : " (missing)"
    }`;
  }

  return "literal (직접 텍스트)";
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
    if (v2_COMPUTED_KEY_SET.has(computedKey)) {
      return {
        mode: "computed",
        key: computedKey as (typeof v2_TEMPLATE_COMPUTED_BINDING_KEYS)[number],
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
    const entrySelector =
      scope === "entry" &&
      currentBinding.mode === "field" &&
      currentBinding.scope === "entry" &&
      currentBinding.entrySelector?.mode === "index"
        ? currentBinding.entrySelector
        : undefined;
    return {
      mode: "field",
      scope,
      key,
      ...(entrySelector ? { entrySelector } : {}),
    };
  }

  return null;
};
