import {
  StudioBuiltinFieldDefinition,
  StudioAsset,
  StudioBinding,
  StudioGraphNode,
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioBuiltinFieldValue } from "@/utils/template-studio/builtin-fields";
import {
  getStudioRuntimeInputValue,
  StudioRuntimeContext,
} from "@/utils/template-studio/input-values";

const textBindingKinds = new Set<StudioBinding["kind"]>([
  "staticText",
  "inputText",
  "selectText",
  "builtinField",
]);

const imageBindingKinds = new Set<StudioBinding["kind"]>([
  "staticAsset",
  "inputImage",
  "selectAsset",
]);

export const isStudioTextNode = (node: StudioGraphNode): boolean =>
  node.type === "text" || node.type === "flexibleText";

export const isStudioImageNode = (node: StudioGraphNode): boolean =>
  node.type === "image";

export const isStudioTextBinding = (binding?: StudioBinding): boolean =>
  !!binding && textBindingKinds.has(binding.kind);

export const isStudioImageBinding = (binding?: StudioBinding): boolean =>
  !!binding && imageBindingKinds.has(binding.kind);

export const getStudioBindingInputId = (
  binding?: StudioBinding
): string | null => {
  if (!binding) return null;
  if (
    binding.kind === "staticText" ||
    binding.kind === "staticAsset" ||
    binding.kind === "builtinField"
  ) {
    return null;
  }

  return binding.inputId;
};

export const isStudioInputCompatibleWithNode = (
  input: StudioInputDefinition,
  node: StudioGraphNode
): boolean => {
  if (isStudioTextNode(node)) return input.type === "text" || input.type === "select";
  if (isStudioImageNode(node)) return input.type === "image" || input.type === "select";
  return false;
};

export const isStudioBuiltinFieldCompatibleWithNode = (
  field: StudioBuiltinFieldDefinition,
  node: StudioGraphNode,
): boolean => isStudioTextNode(node) && Boolean(field);

export const createStudioBindingForBuiltinField = (
  node: StudioGraphNode,
  field: StudioBuiltinFieldDefinition,
): StudioBinding | null => {
  if (!isStudioBuiltinFieldCompatibleWithNode(field, node)) return null;
  return { kind: "builtinField", fieldId: field.id };
};

export const createStudioBindingForInput = (
  node: StudioGraphNode,
  input: StudioInputDefinition
): StudioBinding | null => {
  if (!isStudioInputCompatibleWithNode(input, node)) return null;

  if (isStudioTextNode(node)) {
    if (input.type === "text") return { kind: "inputText", inputId: input.id };
    if (input.type === "select") {
      return { kind: "selectText", inputId: input.id, output: "label" };
    }
  }

  if (isStudioImageNode(node)) {
    if (input.type === "image") return { kind: "inputImage", inputId: input.id };
    if (input.type === "select") {
      return {
        kind: "selectAsset",
        inputId: input.id,
        assetByOption: Object.fromEntries(
          input.options.map((option) => [option.value, null])
        ),
      };
    }
  }

  return null;
};

export const getStudioSelectedOption = (
  input: StudioInputDefinition | undefined,
  values: StudioRuntimeValues,
  context?: StudioRuntimeContext
) => {
  if (!input || input.type !== "select") return null;

  const selectedValue = getStudioRuntimeInputValue(input, values, context);
  return (
    input.options.find((option) => option.value === selectedValue) ??
    input.options[0] ??
    null
  );
};

export const resolveStudioTextBinding = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  binding?: StudioBinding,
  context?: StudioRuntimeContext
): string => {
  if (!binding) return "";

  if (binding.kind === "staticText") return binding.value;
  if (binding.kind === "builtinField") {
    return resolveStudioBuiltinFieldValue(
      document,
      values,
      binding.fieldId,
      context,
    );
  }

  if (binding.kind === "inputText") {
    const input = document.inputs[binding.inputId];
    if (!input || input.type !== "text") return "";
    return getStudioRuntimeInputValue(input, values, context);
  }

  if (binding.kind === "selectText") {
    const input = document.inputs[binding.inputId];
    const selectedOption = getStudioSelectedOption(input, values, context);
    if (!selectedOption) return "";
    return binding.output === "label" ? selectedOption.label : selectedOption.value;
  }

  return "";
};

export const resolveStudioAsset = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  binding?: StudioBinding,
  context?: StudioRuntimeContext
): StudioAsset | null => {
  if (!binding) return null;

  if (binding.kind === "staticAsset") {
    return document.assets[binding.assetId] ?? null;
  }

  if (binding.kind === "inputImage") {
    const input = document.inputs[binding.inputId];
    if (!input || input.type !== "image") return null;
    const value = getStudioRuntimeInputValue(input, values, context);
    if (!value) return null;

    return {
      id: `runtime:${input.id}`,
      label: input.label,
      src: value,
    };
  }

  if (binding.kind === "selectAsset") {
    const input = document.inputs[binding.inputId];
    const selectedOption = getStudioSelectedOption(input, values, context);
    if (!selectedOption) return null;

    const assetId = binding.assetByOption[selectedOption.value];
    if (!assetId) return null;
    return document.assets[assetId] ?? null;
  }

  return null;
};
