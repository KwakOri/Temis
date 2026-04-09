import { CardInputConfig, SimpleFieldConfig } from "@/types/time-table/data";
import {
  V2TemplateFormField,
  V2TemplateFormSchema,
} from "@/types/time-table/template-render-config";

const v2_toSimpleFieldConfig = (
  field: V2TemplateFormField
): SimpleFieldConfig => {
  return {
    key: field.key,
    scope: field.scope,
    type: field.type,
    ...(field.label ? { label: field.label } : {}),
    placeholder: field.placeholder,
    ...(typeof field.required === "boolean" ? { required: field.required } : {}),
    ...(typeof field.maxLength === "number" ? { maxLength: field.maxLength } : {}),
    ...(field.options ? { options: field.options } : {}),
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
  };
};

export const v2_toCardInputConfig = (
  formSchema: V2TemplateFormSchema
): CardInputConfig => {
  return {
    fields: formSchema.fields.map(v2_toSimpleFieldConfig),
    ...(typeof formSchema.showLabels === "boolean"
      ? { showLabels: formSchema.showLabels }
      : {}),
    ...(formSchema.offlineToggle ? { offlineToggle: formSchema.offlineToggle } : {}),
  };
};

const v2_normalizeLegacyCardInputConfig = (
  cardInputConfig: CardInputConfig
): CardInputConfig => {
  return {
    fields: cardInputConfig.fields.map((field) => {
      return {
        key: field.key,
        scope: field.scope ?? "entry",
        type: field.type,
        ...(field.label ? { label: field.label } : {}),
        placeholder: field.placeholder,
        ...(typeof field.required === "boolean"
          ? { required: field.required }
          : {}),
        ...(typeof field.maxLength === "number"
          ? { maxLength: field.maxLength }
          : {}),
        ...(field.options ? { options: field.options } : {}),
        ...(field.defaultValue !== undefined
          ? { defaultValue: field.defaultValue }
          : {}),
        ...(typeof field.isOffline === "boolean"
          ? { isOffline: field.isOffline }
          : {}),
      };
    }),
    ...(typeof cardInputConfig.showLabels === "boolean"
      ? { showLabels: cardInputConfig.showLabels }
      : {}),
    ...(cardInputConfig.offlineToggle
      ? { offlineToggle: cardInputConfig.offlineToggle }
      : {}),
  };
};

export const v2_isFormSchemaEquivalentToCardInputConfig = ({
  formSchema,
  cardInputConfig,
}: {
  formSchema: V2TemplateFormSchema;
  cardInputConfig: CardInputConfig;
}): boolean => {
  const normalizedFormSchemaConfig = v2_toCardInputConfig(formSchema);
  const normalizedLegacyConfig = v2_normalizeLegacyCardInputConfig(
    cardInputConfig
  );

  return (
    JSON.stringify(normalizedFormSchemaConfig) ===
    JSON.stringify(normalizedLegacyConfig)
  );
};
