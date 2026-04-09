"use client";

import { useState } from "react";

import {
  V2TemplateCardNode,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";
import { V2NodeNewFieldDraft } from "../model/binding-utils";

interface UseTemplateNodeBindingFieldActionsParams {
  appendFormField: (
    seed?: Partial<V2TemplateFormField>
  ) => V2TemplateFormField | null;
  setFormSchemaError: (error: string | null) => void;
  onBindCardNodeField: (
    nodeId: string,
    field: { scope: V2TemplateFieldScope; key: string }
  ) => void;
  onBindSceneNodeField: (
    nodeId: string,
    field: { scope: V2TemplateFieldScope; key: string }
  ) => void;
}

const useTemplateNodeBindingFieldActions = ({
  appendFormField,
  setFormSchemaError,
  onBindCardNodeField,
  onBindSceneNodeField,
}: UseTemplateNodeBindingFieldActionsParams) => {
  const [newFieldDraftByNodeId, setNewFieldDraftByNodeId] = useState<
    Record<string, V2NodeNewFieldDraft>
  >({});

  const updateNodeNewFieldDraft = (
    nodeId: string,
    patch: Partial<V2NodeNewFieldDraft>
  ) => {
    setNewFieldDraftByNodeId((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] ?? { scope: "entry", key: "" }),
        ...patch,
      },
    }));
  };

  const createFieldForNodeBinding = ({
    nodeId,
    nodeLabel,
    onBindField,
  }: {
    nodeId: string;
    nodeLabel: string;
    onBindField: (scope: V2TemplateFieldScope, key: string) => void;
  }) => {
    const draft = newFieldDraftByNodeId[nodeId];
    const key = draft?.key?.trim();
    if (!key) {
      setFormSchemaError("새 필드 키를 입력해 주세요.");
      return;
    }
    const scope = draft?.scope ?? "entry";

    const field = appendFormField({
      key,
      scope,
      type: "text",
      placeholder: key,
      label: nodeLabel,
      defaultValue: "",
    });
    if (!field) return;

    onBindField(field.scope, field.key);
    updateNodeNewFieldDraft(nodeId, { key: "", scope: "entry" });
  };

  const createFieldForCardNodeBinding = (node: V2TemplateCardNode) => {
    createFieldForNodeBinding({
      nodeId: node.id,
      nodeLabel: node.label,
      onBindField: (scope, key) => {
        onBindCardNodeField(node.id, { scope, key });
      },
    });
  };

  const createFieldForSceneNodeBinding = (node: V2TemplateSceneTextNode) => {
    createFieldForNodeBinding({
      nodeId: node.id,
      nodeLabel: node.label,
      onBindField: (scope, key) => {
        onBindSceneNodeField(node.id, { scope, key });
      },
    });
  };

  return {
    newFieldDraftByNodeId,
    updateNodeNewFieldDraft,
    createFieldForCardNodeBinding,
    createFieldForSceneNodeBinding,
  };
};

export default useTemplateNodeBindingFieldActions;
