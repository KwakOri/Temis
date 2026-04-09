"use client";

import {
  V2TemplateFormField,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_withRuntimeStructure } from "@/utils/time-table/template-runtime-structure";

interface UseTemplateFormSchemaActionsParams {
  renderConfig: V2TemplateRenderConfig;
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  setFormSchemaError: (error: string | null) => void;
}

const useTemplateFormSchemaActions = ({
  renderConfig,
  safeUpdateConfig,
  setFormSchemaError,
}: UseTemplateFormSchemaActionsParams) => {
  const rewriteGraphFieldBinding = ({
    graphNodes,
    scope,
    key,
    replaceWith,
  }: {
    graphNodes: V2TemplateRenderConfig["graph"]["nodes"];
    scope: V2TemplateFormField["scope"];
    key: string;
    replaceWith:
      | { mode: "field"; scope: V2TemplateFormField["scope"]; key: string }
      | { mode: "literal"; value: string };
  }) => {
    return Object.fromEntries(
      Object.entries(graphNodes).map(([nodeId, node]) => {
        const shouldRewrite =
          node.binding?.mode === "field" &&
          node.binding.scope === scope &&
          node.binding.key === key;
        if (!shouldRewrite) return [nodeId, node];
        return [
          nodeId,
          {
            ...node,
            binding: replaceWith,
          },
        ];
      })
    );
  };

  const updateFormSchema = (
    updater: (
      prev: V2TemplateRenderConfig["formSchema"]
    ) => V2TemplateRenderConfig["formSchema"]
  ) => {
    safeUpdateConfig((prev) => {
      const nextFormSchema = updater(prev.formSchema);
      return {
        ...prev,
        formSchema: nextFormSchema,
      };
    });
  };

  const countLinkedGraphBindingNodes = ({
    nodes,
    scope,
    key,
  }: {
    nodes: V2TemplateRenderConfig["graph"]["nodes"];
    scope: V2TemplateFormField["scope"];
    key: string;
  }): number => {
    return Object.values(nodes).filter((node) => {
      return (
        node.binding?.mode === "field" &&
        node.binding.scope === scope &&
        node.binding.key === key
      );
    }).length;
  };

  const hasDuplicatedFormFieldKey = (
    key: string,
    excludeIndex?: number,
    fields = renderConfig.formSchema.fields
  ): boolean => {
    const normalized = key.trim();
    if (!normalized) return false;
    return fields.some(
      (field, index) => field.key === normalized && index !== excludeIndex
    );
  };

  const updateFormFieldAt = (
    index: number,
    patch: Partial<V2TemplateFormField>
  ) => {
    safeUpdateConfig((prev) => {
      const prevField = prev.formSchema.fields[index];
      if (!prevField) return prev;

      const nextKey = (patch.key ?? prevField.key).trim();
      if (!nextKey) {
        setFormSchemaError("필드 키는 비워둘 수 없습니다.");
        return prev;
      }

      if (hasDuplicatedFormFieldKey(nextKey, index, prev.formSchema.fields)) {
        setFormSchemaError(`중복된 필드 키입니다: ${nextKey}`);
        return prev;
      }

      setFormSchemaError(null);

      const nextField: V2TemplateFormField = {
        ...prevField,
        ...patch,
        key: nextKey,
      };
      const nextFields = [...prev.formSchema.fields];
      nextFields[index] = nextField;
      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };
      const nextGraphNodes = rewriteGraphFieldBinding({
        graphNodes: prev.graph.nodes,
        scope: prevField.scope,
        key: prevField.key,
        replaceWith: {
          mode: "field",
          scope: nextField.scope,
          key: nextField.key,
        },
      });
      const nextGraph = {
        ...prev.graph,
        nodes: nextGraphNodes,
      };
      return v2_withRuntimeStructure({
        ...prev,
        graph: nextGraph,
        formSchema: nextFormSchema,
      });
    });
  };

  const appendFormField = (
    seed?: Partial<V2TemplateFormField>
  ): V2TemplateFormField | null => {
    const rawKey = seed?.key?.trim() ?? "";
    const key =
      rawKey.length > 0
        ? rawKey
        : `field${renderConfig.formSchema.fields.length + 1}`;

    if (hasDuplicatedFormFieldKey(key)) {
      setFormSchemaError(`중복된 필드 키입니다: ${key}`);
      return null;
    }

    const newField: V2TemplateFormField = {
      key,
      scope: seed?.scope ?? "entry",
      type: seed?.type ?? "text",
      placeholder: seed?.placeholder ?? key,
      ...(seed?.label ? { label: seed.label } : {}),
      ...(seed?.defaultValue !== undefined
        ? { defaultValue: seed.defaultValue }
        : {}),
      ...(typeof seed?.required === "boolean"
        ? { required: seed.required }
        : {}),
    };

    setFormSchemaError(null);
    updateFormSchema((prevFormSchema) => ({
      ...prevFormSchema,
      fields: [...prevFormSchema.fields, newField],
    }));
    return newField;
  };

  const removeFormFieldAt = (index: number) => {
    const targetField = renderConfig.formSchema.fields[index];
    if (!targetField) return;

    const linkedNodeCount = countLinkedGraphBindingNodes({
      nodes: renderConfig.graph.nodes,
      scope: targetField.scope,
      key: targetField.key,
    });

    if (linkedNodeCount > 0) {
      const confirmed = window.confirm(
        `이 필드는 ${linkedNodeCount}개 오브젝트에서 사용 중입니다. 삭제하면 해당 바인딩이 비워집니다. 계속할까요?`
      );
      if (!confirmed) return;
    }

    setFormSchemaError(null);
    safeUpdateConfig((prev) => {
      const nextFields = prev.formSchema.fields.filter((_, i) => i !== index);

      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };
      const nextGraphNodes = rewriteGraphFieldBinding({
        graphNodes: prev.graph.nodes,
        scope: targetField.scope,
        key: targetField.key,
        replaceWith: {
          mode: "literal",
          value: "",
        },
      });
      const nextGraph = {
        ...prev.graph,
        nodes: nextGraphNodes,
      };
      return v2_withRuntimeStructure({
        ...prev,
        graph: nextGraph,
        formSchema: nextFormSchema,
      });
    });
  };

  return {
    updateFormFieldAt,
    appendFormField,
    removeFormFieldAt,
  };
};

export default useTemplateFormSchemaActions;
