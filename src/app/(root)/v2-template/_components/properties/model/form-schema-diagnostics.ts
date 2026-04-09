"use client";

import {
  V2TemplateCardNode,
  V2TemplateFormField,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";

export interface V2FormSchemaDiagnostics {
  totalFields: number;
  unusedFields: V2TemplateFormField[];
  missingBindings: Array<{ nodeLabel: string; scope: string; key: string }>;
  duplicateFields: Array<{ scope: string; key: string; count: number }>;
  invalidFields: Array<{ scope: string; key: string; reason: string }>;
}

export const v2_collectFormSchemaDiagnostics = ({
  fields,
  cardNodes,
  sceneTextNodes,
}: {
  fields: V2TemplateFormField[];
  cardNodes: V2TemplateCardNode[];
  sceneTextNodes: V2TemplateSceneTextNode[];
}): V2FormSchemaDiagnostics => {
  const fieldIdSet = new Set<string>();
  const fieldUsageMap = new Map<string, number>();
  const duplicateCounter = new Map<string, number>();

  fields.forEach((field) => {
    const fieldId = `${field.scope}:${field.key}`;
    fieldIdSet.add(fieldId);
    fieldUsageMap.set(fieldId, 0);
    duplicateCounter.set(fieldId, (duplicateCounter.get(fieldId) ?? 0) + 1);
  });

  const missingBindings: Array<{ nodeLabel: string; scope: string; key: string }> = [];
  [...cardNodes, ...sceneTextNodes].forEach((node) => {
    const binding = node.binding;
    if (binding.mode !== "field") return;
    const fieldId = `${binding.scope}:${binding.key}`;
    if (!fieldIdSet.has(fieldId)) {
      missingBindings.push({
        nodeLabel: node.label,
        scope: binding.scope,
        key: binding.key,
      });
      return;
    }
    fieldUsageMap.set(fieldId, (fieldUsageMap.get(fieldId) ?? 0) + 1);
  });

  const duplicateFields = Array.from(duplicateCounter.entries())
    .filter(([, count]) => count > 1)
    .map(([fieldId, count]) => {
      const [scope, key] = fieldId.split(":");
      return {
        scope,
        key,
        count,
      };
    });

  const invalidFields: Array<{ scope: string; key: string; reason: string }> = [];
  fields.forEach((field) => {
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      invalidFields.push({
        scope: field.scope,
        key: field.key,
        reason: "select 타입은 options가 필요합니다.",
      });
    }
    if (field.type === "number" && field.defaultValue !== undefined) {
      const numeric =
        typeof field.defaultValue === "number"
          ? field.defaultValue
          : Number(field.defaultValue);
      if (!Number.isFinite(numeric)) {
        invalidFields.push({
          scope: field.scope,
          key: field.key,
          reason: "number 타입의 defaultValue는 숫자여야 합니다.",
        });
      }
    }
  });

  const unusedFields = fields.filter((field) => {
    const fieldId = `${field.scope}:${field.key}`;
    return (fieldUsageMap.get(fieldId) ?? 0) === 0;
  });

  return {
    totalFields: fields.length,
    missingBindings,
    unusedFields,
    duplicateFields,
    invalidFields,
  };
};
