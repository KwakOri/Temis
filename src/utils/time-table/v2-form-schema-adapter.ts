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
