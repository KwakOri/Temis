import {
  StudioBinding,
  StudioDiagnostic,
  StudioExceptionObjectMeta,
  StudioGraphNode,
  StudioNodeId,
  StudioSemanticPresetScope,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import {
  getStudioBuiltinField,
  isStudioBuiltinFieldAvailable,
  isStudioBuiltinFieldId,
} from "@/utils/template-studio/builtin-fields";
import {
  isStudioImageBinding,
  isStudioImageNode,
  isStudioTextBinding,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import {
  getStudioStatusRequiredCapability,
  getStudioTimetableCapabilities,
  isStudioTimetableStatusAvailable,
} from "@/utils/template-studio/timetable-capabilities";
import { isStudioStatusCardBackgroundNode } from "@/utils/template-studio/status-card-background";
import { parseStudioWebFontCss } from "@/utils/template-studio/web-fonts";
import { getStudioVariantEntryGroups } from "@/utils/template-studio/entry-groups";
import { getStudioOfflineMemoTextNode } from "@/utils/template-studio/status-variants";

const createDiagnostic = (
  severity: StudioDiagnostic["severity"],
  id: string,
  title: string,
  detail: string,
): StudioDiagnostic => ({
  severity,
  id,
  title,
  detail,
});

const getBindingInputId = (binding?: StudioBinding): string | null => {
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

type StudioInputConsumerWorkspace = "cards" | "timetable";

interface StudioInputConsumerDiagnosticReference {
  id: string;
  inputId: string;
  workspace: StudioInputConsumerWorkspace;
  label: string;
  detail: string;
}

const STUDIO_EXCEPTION_SEMANTIC_KEYS = new Set<string>([
  "dayCardContainers",
  "board",
  "weekDates",
  "weeklyMemo",
  "profileBlock",
  "artistProfileText",
  "topObject",
  "dayLabel",
  "dayDate",
  "entryStatusLabel",
  "statusCardBackground",
]);

const STUDIO_EXCEPTION_SCOPES = new Set<string>(["cards", "timetable"]);
const STUDIO_CAPABILITY_KEYS = new Set<string>(["multi", "offlineMemo"]);

const addInputConsumer = (
  consumers: Record<string, StudioInputConsumerDiagnosticReference[]>,
  inputId: string | null | undefined,
  consumer: Omit<StudioInputConsumerDiagnosticReference, "inputId">,
) => {
  if (!inputId) return;

  consumers[inputId] = [
    ...(consumers[inputId] ?? []),
    {
      ...consumer,
      inputId,
    },
  ];
};

const collectStudioInputConsumers = (
  document: StudioTemplateDocument,
): Record<string, StudioInputConsumerDiagnosticReference[]> => {
  const consumers: Record<string, StudioInputConsumerDiagnosticReference[]> =
    {};

  Object.values(document.graph.nodes).forEach((node) => {
    addInputConsumer(consumers, getBindingInputId(node.binding), {
      id: `cards:${node.id}:binding`,
      workspace: "cards",
      label: node.label,
      detail: "Cards binding",
    });

    Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
      addInputConsumer(consumers, slot.inputId, {
        id: `cards:${node.id}:slot:${slotName}`,
        workspace: "cards",
        label: node.label,
        detail: `Cards ${slotName} slot`,
      });
    });
  });

  Object.values(
    document.domains?.timetable?.composition?.objects ?? {},
  ).forEach((object) => {
    addInputConsumer(consumers, object.variantSet?.inputId, {
      id: `timetable:${object.id}:variant`,
      workspace: "timetable",
      label: object.label,
      detail: "Timetable object state",
    });

    addInputConsumer(consumers, getBindingInputId(object.binding), {
      id: `timetable:${object.id}:binding`,
      workspace: "timetable",
      label: object.label,
      detail: "Timetable binding",
    });

    Object.entries(object.assetSlots ?? {}).forEach(([slotName, slot]) => {
      addInputConsumer(consumers, slot.inputId, {
        id: `timetable:${object.id}:slot:${slotName}`,
        workspace: "timetable",
        label: object.label,
        detail: `Timetable ${slotName} slot`,
      });
    });
  });

  return consumers;
};

const getStyleStringValue = (
  node: StudioGraphNode,
  document: StudioTemplateDocument,
  key: string,
): string | null => {
  if (!node.styleId) return null;

  const value = document.styles[node.styleId]?.[key];
  return typeof value === "string" ? value.trim().toLowerCase() : null;
};

const getStyleNumberValue = (
  node: StudioGraphNode,
  document: StudioTemplateDocument,
  key: string,
): number | null => {
  if (!node.styleId) return null;

  const value = document.styles[node.styleId]?.[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getGraphNodeHiddenReasons = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): string[] => {
  const reasons: string[] = [];
  const display = getStyleStringValue(node, document, "display");
  const visibility = getStyleStringValue(node, document, "visibility");
  const overflow = getStyleStringValue(node, document, "overflow");
  const opacity = getStyleNumberValue(node, document, "opacity");
  const width = getStyleNumberValue(node, document, "width");
  const height = getStyleNumberValue(node, document, "height");

  if (display === "none") {
    reasons.push("display is none");
  }

  if (visibility === "hidden" || visibility === "collapse") {
    reasons.push(`visibility is ${visibility}`);
  }

  if (opacity !== null && opacity <= 0) {
    reasons.push("opacity is 0");
  }

  const hasCollapsedBox =
    (width !== null && width <= 0) || (height !== null && height <= 0);
  const clipsChildren = overflow === "hidden" || overflow === "clip";
  if (hasCollapsedBox && (node.type !== "group" || clipsChildren)) {
    reasons.push("width or height is 0");
  }

  return reasons;
};

const validateBuiltinFieldReference = (
  document: StudioTemplateDocument,
  ownerId: string,
  ownerLabel: string,
  fieldId: string,
): StudioDiagnostic[] => {
  if (!isStudioBuiltinFieldId(fieldId)) {
    return [
      createDiagnostic(
        "error",
        `binding-builtin-field-missing:${ownerId}:${fieldId}`,
        "Missing built-in field",
        `${ownerLabel} is bound to ${fieldId}, but that built-in field does not exist.`,
      ),
    ];
  }

  const field = getStudioBuiltinField(fieldId);
  if (!field) return [];

  if (!isStudioBuiltinFieldAvailable(document, field)) {
    return [
      createDiagnostic(
        "warning",
        `binding-builtin-field-disabled:${ownerId}:${fieldId}`,
        "Built-in field is disabled",
        `${ownerLabel} uses ${field.label}, but its required capability is not enabled.`,
      ),
    ];
  }

  return [];
};

const validateExceptionObjectMeta = (
  document: StudioTemplateDocument,
  ownerId: string,
  ownerLabel: string,
  meta: StudioExceptionObjectMeta,
  expectedScope: StudioSemanticPresetScope,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];

  if (!STUDIO_EXCEPTION_SEMANTIC_KEYS.has(meta.semanticKey)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `exception-semantic-invalid:${ownerId}`,
        "Invalid exception semantic key",
        `${ownerLabel} uses unknown exception semantic key ${meta.semanticKey}.`,
      ),
    );
  }

  if (!STUDIO_EXCEPTION_SCOPES.has(meta.scope)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `exception-scope-invalid:${ownerId}`,
        "Invalid exception scope",
        `${ownerLabel} uses unknown exception scope ${meta.scope}.`,
      ),
    );
  } else if (meta.scope !== expectedScope) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `exception-scope-mismatch:${ownerId}`,
        "Exception scope mismatch",
        `${ownerLabel} is stored in ${expectedScope}, but its exception scope is ${meta.scope}.`,
      ),
    );
  }

  if (typeof meta.presetId !== "string" || meta.presetId.trim().length === 0) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `exception-preset-missing:${ownerId}`,
        "Missing exception preset id",
        `${ownerLabel} is an exception object and must keep its presetId.`,
      ),
    );
  }

  Object.entries(meta.builtInBindings ?? {}).forEach(([slot, fieldId]) => {
    diagnostics.push(
      ...validateBuiltinFieldReference(
        document,
        `${ownerId}:${slot}`,
        `${ownerLabel} ${slot}`,
        fieldId,
      ),
    );
  });

  (meta.capabilityFlags ?? []).forEach((capabilityKey) => {
    if (!STUDIO_CAPABILITY_KEYS.has(capabilityKey)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `exception-capability-invalid:${ownerId}:${capabilityKey}`,
          "Invalid exception capability",
          `${ownerLabel} references unknown capability ${capabilityKey}.`,
        ),
      );
      return;
    }

    if (
      !getStudioTimetableCapabilities(document.domains?.timetable)[
        capabilityKey
      ].enabled
    ) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `exception-capability-disabled:${ownerId}:${capabilityKey}`,
          "Exception capability is disabled",
          `${ownerLabel} references ${capabilityKey}, but that capability is not enabled.`,
        ),
      );
    }
  });

  return diagnostics;
};

const validateTimetableCompositionObjectBinding = (
  document: StudioTemplateDocument,
  object: StudioTimetableCompositionObject,
): StudioDiagnostic[] => {
  if (!object.binding) return [];

  const diagnostics: StudioDiagnostic[] = [];
  const inputId = getBindingInputId(object.binding);
  const input = inputId ? document.inputs[inputId] : null;

  if (
    (object.kind === "text" || object.kind === "flexibleText") &&
    !isStudioTextBinding(object.binding)
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-binding-type:${object.id}`,
        "Binding does not match timetable text object",
        `${object.label} is a text object, so it needs a text-compatible binding.`,
      ),
    );
  }

  if (inputId && !input) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-binding-input-missing:${object.id}`,
        "Missing input reference",
        `${object.label} is bound to ${inputId}, but that input does not exist.`,
      ),
    );
  }

  if (object.binding.kind === "builtinField") {
    diagnostics.push(
      ...validateBuiltinFieldReference(
        document,
        object.id,
        object.label,
        object.binding.fieldId,
      ),
    );
  }

  if (object.binding.kind === "inputText" && input && input.type !== "text") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-binding-input-type:${object.id}`,
        "Input type mismatch",
        `${object.label} expects a text input, but ${input.label} is ${input.type}.`,
      ),
    );
  }

  if (
    object.binding.kind === "selectText" &&
    input &&
    input.type !== "select"
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-binding-input-type:${object.id}`,
        "Input type mismatch",
        `${object.label} expects a select input, but ${input.label} is ${input.type}.`,
      ),
    );
  }

  return diagnostics;
};

const validateTimetableCompositionObjectAssets = (
  document: StudioTemplateDocument,
  object: StudioTimetableCompositionObject,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];

  if (object.backgroundAssetId && !document.assets[object.backgroundAssetId]) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-background-asset-missing:${object.id}`,
        "Missing background asset",
        `${object.label} uses ${object.backgroundAssetId} as a background asset, but that asset does not exist.`,
      ),
    );
  }

  Object.entries(object.assetSlots ?? {}).forEach(([slotName, slot]) => {
    if (slot.assetId && slot.inputId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-object-asset-slot-source-conflict:${object.id}:${slotName}`,
          "Conflicting slot sources",
          `${object.label} uses both template asset and image input for ${slotName}.`,
        ),
      );
    }

    if (
      slotName === "background" &&
      slot.assetId === object.backgroundAssetId &&
      !slot.inputId
    ) {
      return;
    }

    if (slot.assetId && !document.assets[slot.assetId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-object-asset-slot-missing:${object.id}:${slotName}`,
          "Missing slot asset",
          `${object.label} uses ${slot.assetId} for ${slotName}, but that asset does not exist.`,
        ),
      );
    }

    if (slot.inputId) {
      const input = document.inputs[slot.inputId];

      if (!input) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-object-asset-slot-input-missing:${object.id}:${slotName}`,
            "Missing slot input",
            `${object.label} uses ${slot.inputId} for ${slotName}, but that input does not exist.`,
          ),
        );
        return;
      }

      if (input.type !== "image") {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-object-asset-slot-input-type:${object.id}:${slotName}`,
            "Input type mismatch",
            `${object.label} expects an image input for ${slotName}, but ${input.label} is ${input.type}.`,
          ),
        );
      }
    }
  });

  return diagnostics;
};

const validateTimetableCompositionObjectVariants = (
  document: StudioTemplateDocument,
  object: StudioTimetableCompositionObject,
  objects: Record<string, StudioTimetableCompositionObject>,
): StudioDiagnostic[] => {
  const variantSet = object.variantSet;
  if (!variantSet) return [];

  const diagnostics: StudioDiagnostic[] = [];
  const optionValues = variantSet.options.map((option) => option.value);
  const uniqueOptionValues = new Set(optionValues);

  if (object.kind !== "group") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-owner-kind:${object.id}`,
        "Object state owner must be a group",
        `${object.label} defines object states but is not a group object.`,
      ),
    );
  }

  if (
    optionValues.length === 0 ||
    uniqueOptionValues.size !== optionValues.length
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-options-invalid:${object.id}`,
        "Invalid object state options",
        `${object.label} needs at least one uniquely named object state.`,
      ),
    );
  }

  if (!uniqueOptionValues.has(variantSet.defaultValue)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-default-invalid:${object.id}`,
        "Invalid default object state",
        `${object.label} uses ${variantSet.defaultValue} as its default, but that state is not defined.`,
      ),
    );
  }

  if (
    variantSet.activeValue &&
    !uniqueOptionValues.has(variantSet.activeValue)
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-active-invalid:${object.id}`,
        "Invalid authoring object state",
        `${object.label} is editing ${variantSet.activeValue}, but that state is not defined.`,
      ),
    );
  }

  const input = variantSet.inputId ? document.inputs[variantSet.inputId] : null;
  if (variantSet.inputId && !input) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-input-missing:${object.id}`,
        "Missing object state input",
        `${object.label} references ${variantSet.inputId}, but that input does not exist.`,
      ),
    );
  } else if (input && input.type !== "select") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-input-type:${object.id}`,
        "Object state input must be select",
        `${object.label} expects a select input, but ${input.label} is ${input.type}.`,
      ),
    );
  } else if (input?.type === "select" && input.scope !== "global") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-object-variant-input-scope:${object.id}`,
        "Object state input must be global",
        `${object.label} is a timetable-level object, but ${input.label} uses ${input.scope} scope.`,
      ),
    );
  } else if (input?.type === "select") {
    const inputValues = new Set(input.options.map((option) => option.value));
    const missingValues = optionValues.filter(
      (value) => !inputValues.has(value),
    );
    if (missingValues.length > 0) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-object-variant-input-options:${object.id}`,
          "Object state input options do not match",
          `${input.label} is missing: ${missingValues.join(", ")}.`,
        ),
      );
    }
  }

  variantSet.options.forEach((option) => {
    const rootObjectId = variantSet.rootByValue[option.value];
    if (!rootObjectId) return;

    if (!objects[rootObjectId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-object-variant-root-missing:${object.id}:${option.value}`,
          "Missing object state root",
          `${object.label} maps ${option.label} to ${rootObjectId}, but that object does not exist.`,
        ),
      );
      return;
    }

    if (!(object.childIds ?? []).includes(rootObjectId)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-object-variant-root-not-child:${object.id}:${option.value}`,
          "Object state root is not a child",
          `${rootObjectId} must be a direct child of ${object.label}.`,
        ),
      );
    }
  });

  return diagnostics;
};

const validateBinding = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): StudioDiagnostic[] => {
  if (!node.binding) return [];

  const diagnostics: StudioDiagnostic[] = [];
  const inputId = getBindingInputId(node.binding);
  const input = inputId ? document.inputs[inputId] : null;

  if (inputId && !input) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-input-missing:${node.id}`,
        "Missing input reference",
        `${node.label} is bound to ${inputId}, but that input does not exist.`,
      ),
    );
  }

  if (isStudioTextNode(node) && !isStudioTextBinding(node.binding)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-type-node:${node.id}`,
        "Binding does not match text node",
        `${node.label} is a text node, so it needs a text-compatible binding.`,
      ),
    );
  }

  if (isStudioImageNode(node) && !isStudioImageBinding(node.binding)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-type-node:${node.id}`,
        "Binding does not match image node",
        `${node.label} is an image node, so it needs an image-compatible binding.`,
      ),
    );
  }

  if (node.binding.kind === "builtinField") {
    diagnostics.push(
      ...validateBuiltinFieldReference(
        document,
        node.id,
        node.label,
        node.binding.fieldId,
      ),
    );
  }

  if (node.binding.kind === "inputText" && input && input.type !== "text") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-input-type:${node.id}`,
        "Input type mismatch",
        `${node.label} expects a text input, but ${input.label} is ${input.type}.`,
      ),
    );
  }

  if (node.binding.kind === "inputImage" && input && input.type !== "image") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-input-type:${node.id}`,
        "Input type mismatch",
        `${node.label} expects an image input, but ${input.label} is ${input.type}.`,
      ),
    );
  }

  if (
    (node.binding.kind === "selectText" ||
      node.binding.kind === "selectAsset") &&
    input &&
    input.type !== "select"
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-input-type:${node.id}`,
        "Input type mismatch",
        `${node.label} expects a select input, but ${input.label} is ${input.type}.`,
      ),
    );
  }

  if (node.binding.kind === "staticAsset") {
    const asset = document.assets[node.binding.assetId];
    if (!asset) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `binding-asset-missing:${node.id}`,
          "Missing asset reference",
          `${node.label} uses ${node.binding.assetId}, but that asset does not exist.`,
        ),
      );
    }
  }

  if (node.binding.kind === "selectAsset" && input?.type === "select") {
    const selectAssetBinding = node.binding;
    const optionValues = new Set(input.options.map((option) => option.value));

    Object.keys(selectAssetBinding.assetByOption).forEach((optionValue) => {
      if (!optionValues.has(optionValue)) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `binding-select-option-missing:${node.id}:${optionValue}`,
            "Missing select option",
            `${node.label} maps ${optionValue}, but ${input.label} does not define that option.`,
          ),
        );
      }
    });

    input.options.forEach((option) => {
      const assetId = selectAssetBinding.assetByOption[option.value];

      if (!(option.value in selectAssetBinding.assetByOption)) {
        diagnostics.push(
          createDiagnostic(
            "warning",
            `binding-select-asset-unmapped:${node.id}:${option.value}`,
            "Unmapped select option",
            `${node.label} has no asset mapping for ${option.label}.`,
          ),
        );
      }

      if (assetId && !document.assets[assetId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `binding-select-asset-missing:${node.id}:${option.value}`,
            "Missing select asset",
            `${node.label} maps ${option.label} to ${assetId}, but that asset does not exist.`,
          ),
        );
      }
    });
  }

  return diagnostics;
};

const validateGraphNodeAssetSlots = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];

  Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
    if (slot.assetId && slot.inputId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `node-asset-slot-source-conflict:${node.id}:${slotName}`,
          "Conflicting slot sources",
          `${node.label} uses both template asset and image input for ${slotName}.`,
        ),
      );
    }

    if (slot.assetId && !document.assets[slot.assetId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `node-asset-slot-missing:${node.id}:${slotName}`,
          "Missing slot asset",
          `${node.label} uses ${slot.assetId} for ${slotName}, but that asset does not exist.`,
        ),
      );
    }

    if (slot.inputId) {
      const input = document.inputs[slot.inputId];

      if (!input) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `node-asset-slot-input-missing:${node.id}:${slotName}`,
            "Missing slot input",
            `${node.label} uses ${slot.inputId} for ${slotName}, but that input does not exist.`,
          ),
        );
        return;
      }

      if (input.type !== "image") {
        diagnostics.push(
          createDiagnostic(
            "error",
            `node-asset-slot-input-type:${node.id}:${slotName}`,
            "Input type mismatch",
            `${node.label} expects an image input for ${slotName}, but ${input.label} is ${input.type}.`,
          ),
        );
      }
    }
  });

  if (isStudioStatusCardBackgroundNode(node)) {
    const slot = node.assetSlots?.asset;
    if (!slot?.assetId && !slot?.inputId) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `status-background-asset-missing:${node.id}`,
          "Missing background asset",
          `${node.label} has no background asset. The current card layout will fall back to its base style.`,
        ),
      );
    }
  }

  return diagnostics;
};

const validateGraphIntegrity = (
  document: StudioTemplateDocument,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];
  const nodes = document.graph.nodes;
  const rootIds = document.graph.rootNodeIds;
  const rootIdSet = new Set<StudioNodeId>();
  const childOwnerById = new Map<StudioNodeId, StudioNodeId>();

  rootIds.forEach((rootId) => {
    if (rootIdSet.has(rootId)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `root-duplicate:${rootId}`,
          "Duplicate root node",
          `${rootId} appears more than once in graph.rootNodeIds.`,
        ),
      );
    }
    rootIdSet.add(rootId);

    const rootNode = nodes[rootId];
    if (rootNode?.parentId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `root-parent-mismatch:${rootId}`,
          "Root node has a parent",
          `${rootNode.label} is listed as a root but its parentId is ${rootNode.parentId}.`,
        ),
      );
    }
  });

  Object.values(nodes).forEach((node) => {
    const childIds = new Set<StudioNodeId>();

    if (
      node.layoutMode &&
      node.layoutMode !== "fixed" &&
      node.layoutMode !== "fillParent"
    ) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `node-layout-mode-invalid:${node.id}`,
          "Invalid object layout mode",
          `${node.label} uses unsupported layout mode ${node.layoutMode}.`,
        ),
      );
    }

    node.childIds.forEach((childId) => {
      if (childId === node.id) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `child-self-reference:${node.id}`,
            "Node contains itself",
            `${node.label} includes itself as a child.`,
          ),
        );
      }

      if (childIds.has(childId)) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `child-duplicate:${node.id}:${childId}`,
            "Duplicate child reference",
            `${node.label} includes ${childId} more than once.`,
          ),
        );
      }
      childIds.add(childId);

      const previousOwnerId = childOwnerById.get(childId);
      if (previousOwnerId && previousOwnerId !== node.id) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `child-multiple-parents:${childId}`,
            "Node is listed under multiple parents",
            `${childId} is listed under both ${previousOwnerId} and ${node.id}.`,
          ),
        );
      }
      childOwnerById.set(childId, node.id);
    });
  });

  const rootReachableIds = new Set<StudioNodeId>();
  const fullyVisitedIds = new Set<StudioNodeId>();
  const reportedCycleKeys = new Set<string>();

  const visit = (
    nodeId: StudioNodeId,
    stack: StudioNodeId[],
    markRootReachable: boolean,
  ) => {
    const node = nodes[nodeId];
    if (!node) return;

    const cycleStartIndex = stack.indexOf(nodeId);
    if (cycleStartIndex >= 0) {
      const cyclePath = [...stack.slice(cycleStartIndex), nodeId];
      const cycleKey = cyclePath.join(">");
      if (!reportedCycleKeys.has(cycleKey)) {
        reportedCycleKeys.add(cycleKey);
        diagnostics.push(
          createDiagnostic(
            "error",
            `graph-cycle:${cycleKey}`,
            "Graph cycle detected",
            `Layer hierarchy contains a cycle: ${cyclePath.join(" -> ")}.`,
          ),
        );
      }
      return;
    }

    if (markRootReachable) {
      rootReachableIds.add(nodeId);
    }
    if (fullyVisitedIds.has(nodeId)) return;

    node.childIds.forEach((childId) => {
      visit(childId, [...stack, nodeId], markRootReachable);
    });
    fullyVisitedIds.add(nodeId);
  };

  rootIds.forEach((rootId) => visit(rootId, [], true));
  Object.keys(nodes).forEach((nodeId) => {
    if (!fullyVisitedIds.has(nodeId)) {
      visit(nodeId, [], false);
    }
  });

  Object.values(nodes).forEach((node) => {
    if (!rootReachableIds.has(node.id)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `graph-unreachable:${node.id}`,
          "Unreachable graph node",
          `${node.label} exists in graph.nodes but is not reachable from graph.rootNodeIds.`,
        ),
      );
    }

    if (!node.parentId && !rootIdSet.has(node.id)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `graph-rootless:${node.id}`,
          "Rootless node",
          `${node.label} has no parentId but is not listed in graph.rootNodeIds.`,
        ),
      );
    }
  });

  return diagnostics;
};

const validateTimetableDomain = (
  document: StudioTemplateDocument,
): StudioDiagnostic[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];

  const diagnostics: StudioDiagnostic[] = [];
  const nodes = document.graph.nodes;
  const referencedComponentIds = new Set<string>([timetable.entryComponentId]);

  if (timetable.version !== 2) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-version-invalid:${String(timetable.version)}`,
        "Unsupported timetable domain version",
        `The timetable domain uses version ${String(timetable.version)}, but version 2 is required.`,
      ),
    );
  }

  if (!nodes[timetable.mountNodeId]) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-mount-missing:${timetable.mountNodeId}`,
        "Missing timetable mount node",
        `The timetable domain mounts ${timetable.mountNodeId}, but that node does not exist.`,
      ),
    );
  }

  if (timetable.dayIds.length === 0) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "timetable-days-empty",
        "Timetable has no days",
        "The timetable domain needs at least one day id.",
      ),
    );
  }

  const seenDayIds = new Set<string>();
  timetable.dayIds.forEach((dayId) => {
    if (seenDayIds.has(dayId)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-day-duplicate:${dayId}`,
          "Duplicate timetable day",
          `${dayId} appears more than once in timetable.dayIds.`,
        ),
      );
    }
    seenDayIds.add(dayId);

    const day = timetable.days[dayId];
    if (!day) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-day-missing:${dayId}`,
          "Missing timetable day definition",
          `${dayId} is listed in timetable.dayIds, but timetable.days does not define it.`,
        ),
      );
      return;
    }

    if (day.id !== dayId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-day-id-mismatch:${dayId}`,
          "Timetable day id mismatch",
          `${day.label} is stored under ${dayId}, but its id is ${day.id}.`,
        ),
      );
    }

    if (day.componentId) {
      referencedComponentIds.add(day.componentId);
      if (!timetable.components[day.componentId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-day-component-missing:${dayId}:${day.componentId}`,
            "Missing day component set",
            `${day.label} references component set ${day.componentId}, but it does not exist.`,
          ),
        );
      }
    }
  });

  Object.keys(timetable.days).forEach((dayId) => {
    if (!seenDayIds.has(dayId)) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `timetable-day-unused:${dayId}`,
          "Unused timetable day definition",
          `${dayId} is defined in timetable.days but is not included in timetable.dayIds.`,
        ),
      );
    }
  });

  if (timetable.composition) {
    const seenCompositionRootIds = new Set<string>();
    const seenCompositionChildIds = new Set<string>();
    const compositionChildParentIds = new Map<string, string>();

    Object.entries(timetable.composition.objects).forEach(
      ([parentObjectId, parentObject]) => {
        const seenChildIds = new Set<string>();
        if (
          (parentObject.childIds?.length ?? 0) > 0 &&
          parentObject.kind !== "group"
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-composition-children-on-non-group:${parentObjectId}`,
              "Only timetable groups can contain children",
              `${parentObject.label} contains childIds but is not a group object.`,
            ),
          );
        }

        (parentObject.childIds ?? []).forEach((childId) => {
          if (seenChildIds.has(childId)) {
            diagnostics.push(
              createDiagnostic(
                "error",
                `timetable-composition-child-duplicate:${parentObjectId}:${childId}`,
                "Duplicate timetable group child",
                `${childId} appears more than once in ${parentObject.label}.`,
              ),
            );
          }
          seenChildIds.add(childId);
          seenCompositionChildIds.add(childId);

          const existingParentId = compositionChildParentIds.get(childId);
          if (existingParentId && existingParentId !== parentObjectId) {
            diagnostics.push(
              createDiagnostic(
                "error",
                `timetable-composition-child-multiple-parents:${childId}`,
                "Timetable child has multiple parents",
                `${childId} is included by both ${existingParentId} and ${parentObjectId}.`,
              ),
            );
          } else {
            compositionChildParentIds.set(childId, parentObjectId);
          }

          const childObject = timetable.composition?.objects[childId];
          if (!childObject) {
            diagnostics.push(
              createDiagnostic(
                "error",
                `timetable-composition-child-missing:${parentObjectId}:${childId}`,
                "Missing timetable group child",
                `${childId} is listed in ${parentObject.label} but does not exist.`,
              ),
            );
            return;
          }

          if (childObject.parentId !== parentObjectId) {
            diagnostics.push(
              createDiagnostic(
                "error",
                `timetable-composition-child-parent-mismatch:${parentObjectId}:${childId}`,
                "Timetable child parent mismatch",
                `${childObject.label} is listed in ${parentObject.label}, but its parentId does not match.`,
              ),
            );
          }
        });
      },
    );

    const compositionVisitState = new Map<string, "visiting" | "visited">();
    const reportedCompositionCycles = new Set<string>();
    const visitCompositionObject = (objectId: string, path: string[]) => {
      const visitState = compositionVisitState.get(objectId);
      if (visitState === "visited") return;
      if (visitState === "visiting") {
        const cycleStartIndex = path.indexOf(objectId);
        const cyclePath = [
          ...(cycleStartIndex >= 0 ? path.slice(cycleStartIndex) : path),
          objectId,
        ];
        const cycleKey = [...new Set(cyclePath)].sort().join(":");
        if (!reportedCompositionCycles.has(cycleKey)) {
          reportedCompositionCycles.add(cycleKey);
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-composition-cycle:${cycleKey}`,
              "Timetable composition contains a cycle",
              `Group hierarchy loops through ${cyclePath.join(" → ")}.`,
            ),
          );
        }
        return;
      }

      const object = timetable.composition?.objects[objectId];
      if (!object) return;
      compositionVisitState.set(objectId, "visiting");
      (object.childIds ?? []).forEach((childId) =>
        visitCompositionObject(childId, [...path, objectId]),
      );
      compositionVisitState.set(objectId, "visited");
    };

    Object.keys(timetable.composition.objects).forEach((objectId) =>
      visitCompositionObject(objectId, []),
    );

    timetable.composition.rootObjectIds.forEach((objectId) => {
      if (seenCompositionRootIds.has(objectId)) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-composition-root-duplicate:${objectId}`,
            "Duplicate timetable composition root",
            `${objectId} appears more than once in timetable composition roots.`,
          ),
        );
      }
      seenCompositionRootIds.add(objectId);

      if (seenCompositionChildIds.has(objectId)) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-composition-root-is-child:${objectId}`,
            "Timetable object is both root and child",
            `${objectId} cannot be listed as both a root layer and a group child.`,
          ),
        );
      }

      if (!timetable.composition?.objects[objectId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-composition-root-missing:${objectId}`,
            "Missing timetable composition object",
            `${objectId} is listed as a timetable layer but does not exist.`,
          ),
        );
      }
    });

    Object.entries(timetable.composition.objects).forEach(
      ([objectId, object]) => {
        if (
          object.layoutMode &&
          object.layoutMode !== "fixed" &&
          object.layoutMode !== "fillParent"
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-layout-mode-invalid:${objectId}`,
              "Invalid timetable layout mode",
              `${object.label} uses unsupported layout mode ${object.layoutMode}.`,
            ),
          );
        }

        if (object.id !== objectId) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-composition-object-id-mismatch:${objectId}`,
              "Timetable composition object id mismatch",
              `${object.label} is stored under ${objectId}, but its id is ${object.id}.`,
            ),
          );
        }

        if (
          !seenCompositionRootIds.has(objectId) &&
          !seenCompositionChildIds.has(objectId)
        ) {
          diagnostics.push(
            createDiagnostic(
              "warning",
              `timetable-composition-object-orphan:${objectId}`,
              "Timetable composition object is not visible",
              `${object.label} exists in timetable composition objects but is not listed in rootObjectIds.`,
            ),
          );
        }

        if (
          object.parentId &&
          !timetable.composition?.objects[object.parentId]
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-composition-parent-missing:${objectId}`,
              "Missing timetable parent object",
              `${object.label} references missing parent ${object.parentId}.`,
            ),
          );
        }

        if (
          object.parentId &&
          timetable.composition?.objects[object.parentId] &&
          !timetable.composition.objects[object.parentId].childIds?.includes(
            objectId,
          )
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-composition-parent-child-missing:${objectId}`,
              "Timetable parent does not include child",
              `${object.label} references ${object.parentId}, but that parent does not list it as a child.`,
            ),
          );
        }

        const parentVariantSet = object.parentId
          ? timetable.composition?.objects[object.parentId]?.variantSet
          : undefined;
        const isVariantStateRoot = parentVariantSet
          ? Object.values(parentVariantSet.rootByValue).includes(objectId)
          : false;

        if (object.hidden && !isVariantStateRoot) {
          diagnostics.push(
            createDiagnostic(
              "warning",
              `timetable-composition-object-hidden:${objectId}`,
              "Timetable composition object is hidden",
              `${object.label} is explicitly hidden and will not render in the timetable output.`,
            ),
          );
        }

        if (object.meta?.exception) {
          diagnostics.push(
            ...validateExceptionObjectMeta(
              document,
              object.id,
              object.label,
              object.meta.exception,
              "timetable",
            ),
          );
        }

        diagnostics.push(
          ...validateTimetableCompositionObjectBinding(document, object),
          ...validateTimetableCompositionObjectAssets(document, object),
          ...validateTimetableCompositionObjectVariants(
            document,
            object,
            timetable.composition?.objects ?? {},
          ),
        );
      },
    );
  }

  (["online", "offline"] as const).forEach((statusId) => {
    const status = timetable.statuses[statusId];
    if (!status) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-base-status-missing:${statusId}`,
          "Missing base status",
          `The timetable domain requires the ${statusId} base status.`,
        ),
      );
      return;
    }

    if (status.kind !== "base" || status.baseStatus !== statusId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-base-status-invalid:${statusId}`,
          "Invalid base status contract",
          `${status.label} must be a base status whose baseStatus is ${statusId}.`,
        ),
      );
    }
  });

  const capabilities = getStudioTimetableCapabilities(timetable);
  (["multi", "offlineMemo"] as const).forEach((capabilityKey) => {
    if (!capabilities[capabilityKey].enabled) return;
    if (timetable.statuses[capabilityKey]) return;

    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-capability-status-missing:${capabilityKey}`,
        "Missing capability status",
        `${capabilityKey} is enabled, but its timetable status definition is missing.`,
      ),
    );
  });

  Object.entries(timetable.statuses).forEach(([statusId, status]) => {
    const requiredCapability = getStudioStatusRequiredCapability(statusId);

    if (
      requiredCapability &&
      !getStudioTimetableCapabilities(timetable)[requiredCapability].enabled
    ) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `timetable-status-capability-disabled:${statusId}`,
          "Timetable status capability is disabled",
          `${status.label} is defined, but ${requiredCapability} is not enabled for this template.`,
        ),
      );
    }

    if (status.id !== statusId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-status-id-mismatch:${statusId}`,
          "Timetable status id mismatch",
          `${status.label} is stored under ${statusId}, but its id is ${status.id}.`,
        ),
      );
    }

    if (status.kind === "derived") {
      if (!status.fallbackStatusId) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-derived-fallback-missing:${statusId}`,
            "Missing derived status fallback",
            `${status.label} is a derived status and must define fallbackStatusId.`,
          ),
        );
      } else if (!timetable.statuses[status.fallbackStatusId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-derived-fallback-invalid:${statusId}`,
            "Invalid derived status fallback",
            `${status.label} falls back to ${status.fallbackStatusId}, but that status does not exist.`,
          ),
        );
      }
    }
  });

  const multiStatus = timetable.statuses.multi;
  if (
    multiStatus &&
    (multiStatus.kind !== "derived" ||
      multiStatus.baseStatus !== "online" ||
      multiStatus.fallbackStatusId !== "online")
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "timetable-derived-multi-invalid",
        "Invalid multi status contract",
        "multi must be a derived status based on online and fall back to online.",
      ),
    );
  }

  const offlineMemoStatus = timetable.statuses.offlineMemo;
  if (
    offlineMemoStatus &&
    (offlineMemoStatus.kind !== "derived" ||
      offlineMemoStatus.baseStatus !== "offline" ||
      offlineMemoStatus.fallbackStatusId !== "offline")
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "timetable-derived-offline-memo-invalid",
        "Invalid offline memo status contract",
        "offlineMemo must be a derived status based on offline and fall back to offline.",
      ),
    );
  }

  const entryComponent = timetable.components[timetable.entryComponentId];
  if (!entryComponent) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-entry-component-missing:${timetable.entryComponentId}`,
        "Missing entry component",
        `The timetable domain uses ${timetable.entryComponentId}, but that component does not exist.`,
      ),
    );
  }

  Object.entries(timetable.components).forEach(([componentId, component]) => {
    if (referencedComponentIds.has(componentId)) return;
    diagnostics.push(
      createDiagnostic(
        "warning",
        `timetable-component-unused:${componentId}`,
        "Unused component set",
        `${component.label} is not the default and is not assigned to any timetable day.`,
      ),
    );
  });

  const componentOwnerByVariantRootId = new Map<string, string>();
  Object.entries(timetable.components).forEach(([componentId, component]) => {
    Object.values(component.variants).forEach((variant) => {
      const ownerComponentId = componentOwnerByVariantRootId.get(
        variant.rootNodeId,
      );
      if (ownerComponentId && ownerComponentId !== componentId) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-root-shared:${ownerComponentId}:${componentId}:${variant.rootNodeId}`,
            "Component sets share a variant root",
            `${ownerComponentId} and ${componentId} both reference ${variant.rootNodeId}. Component sets must own independent graph roots.`,
          ),
        );
        return;
      }
      componentOwnerByVariantRootId.set(variant.rootNodeId, componentId);
    });
  });

  if (!timetable.statuses[timetable.defaultEntryStatusId]) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-default-status-missing:${timetable.defaultEntryStatusId}`,
        "Missing default entry status",
        `The timetable domain uses ${timetable.defaultEntryStatusId}, but that status does not exist.`,
      ),
    );
  } else if (
    !isStudioTimetableStatusAvailable(timetable, timetable.defaultEntryStatusId)
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-default-status-disabled:${timetable.defaultEntryStatusId}`,
        "Default entry status is disabled",
        `The timetable domain uses ${timetable.defaultEntryStatusId} as the default status, but its capability is not enabled.`,
      ),
    );
  }

  Object.entries(timetable.components).forEach(([componentId, component]) => {
    if (component.id !== componentId) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-id-mismatch:${componentId}`,
          "Timetable component id mismatch",
          `${component.label} is stored under ${componentId}, but its id is ${component.id}.`,
        ),
      );
    }

    if (!timetable.statuses[component.defaultStatusId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-default-status-missing:${componentId}`,
          "Missing component default status",
          `${component.label} uses ${component.defaultStatusId}, but that status does not exist.`,
        ),
      );
    } else if (
      !isStudioTimetableStatusAvailable(timetable, component.defaultStatusId)
    ) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-default-status-disabled:${componentId}`,
          "Component default status is disabled",
          `${component.label} uses ${component.defaultStatusId}, but its capability is not enabled.`,
        ),
      );
    }

    if (
      !component.frame ||
      !Number.isFinite(component.frame.left) ||
      !Number.isFinite(component.frame.top) ||
      !Number.isFinite(component.frame.width) ||
      !Number.isFinite(component.frame.height) ||
      component.frame.width <= 0 ||
      component.frame.height <= 0
    ) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-frame-invalid:${componentId}`,
          "Invalid shared component frame",
          `${component.label} needs one positive shared frame for every status variant.`,
        ),
      );
    }

    (["online", "offline"] as const).forEach((baseStatusId) => {
      if (!component.variants[baseStatusId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-base-variant-missing:${componentId}:${baseStatusId}`,
            "Missing base component variant",
            `${component.label} needs a ${baseStatusId} base variant.`,
          ),
        );
      }
    });

    const statusIdsByRootNodeId = Object.entries(component.variants).reduce<
      Record<string, string[]>
    >((accumulator, [statusId, variant]) => {
      accumulator[variant.rootNodeId] = [
        ...(accumulator[variant.rootNodeId] ?? []),
        statusId,
      ];
      return accumulator;
    }, {});
    Object.entries(statusIdsByRootNodeId).forEach(([rootNodeId, statusIds]) => {
      if (statusIds.length < 2) return;
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-shared-variant-root:${componentId}:${rootNodeId}`,
          "Status variants must be independent",
          `${component.label} shares one root between ${statusIds.join(", ")}.`,
        ),
      );
    });

    Object.entries(component.variants).forEach(([variantStatusId, variant]) => {
      if (variant.statusId !== variantStatusId) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-variant-status-mismatch:${componentId}:${variantStatusId}`,
            "Timetable variant status mismatch",
            `${component.label} stores a variant under ${variantStatusId}, but its statusId is ${variant.statusId}.`,
          ),
        );
      }

      if (!timetable.statuses[variant.statusId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-variant-status-missing:${componentId}:${variant.statusId}`,
            "Missing component variant status",
            `${component.label} uses variant status ${variant.statusId}, but that status does not exist.`,
          ),
        );
      } else if (
        !isStudioTimetableStatusAvailable(timetable, variant.statusId)
      ) {
        diagnostics.push(
          createDiagnostic(
            "warning",
            `timetable-component-variant-status-disabled:${componentId}:${variant.statusId}`,
            "Component variant status is disabled",
            `${component.label} defines a ${variant.statusId} variant, but its capability is not enabled.`,
          ),
        );
      }

      const variantRoot = nodes[variant.rootNodeId];
      if (!variantRoot) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-variant-root-missing:${componentId}:${variantStatusId}`,
            "Missing component variant root",
            `${component.label} ${variantStatusId} points to ${variant.rootNodeId}, but that node does not exist.`,
          ),
        );
      } else {
        const rootStyle = variantRoot.styleId
          ? document.styles[variantRoot.styleId]
          : undefined;
        if (
          component.frame &&
          (["left", "top", "width", "height"] as const).some(
            (key) => rootStyle?.[key] !== component.frame?.[key],
          )
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-component-frame-mismatch:${componentId}:${variantStatusId}`,
              "Variant frame mismatch",
              `${component.label} ${variantStatusId} must use the shared component frame.`,
            ),
          );
        }

        const entryGroups = getStudioVariantEntryGroups(document, variant);
        const slotIndexes = entryGroups.map(
          (group) => group.meta?.entrySlot?.index,
        );
        const expectedSlotIndexes = variantStatusId === "multi" ? [0, 1] : [0];
        if (
          slotIndexes.length !== expectedSlotIndexes.length ||
          expectedSlotIndexes.some(
            (slotIndex) => !slotIndexes.includes(slotIndex as 0 | 1),
          )
        ) {
          diagnostics.push(
            createDiagnostic(
              "error",
              `timetable-component-entry-groups:${componentId}:${variantStatusId}`,
              "Invalid Entry Group contract",
              `${component.label} ${variantStatusId} requires Entry Group slot${expectedSlotIndexes.length > 1 ? "s" : ""} ${expectedSlotIndexes.join(" and ")}.`,
            ),
          );
        }
      }
    });

    Object.entries(timetable.statuses).forEach(([statusId, status]) => {
      if (
        status.kind === "derived" &&
        isStudioTimetableStatusAvailable(timetable, statusId) &&
        !component.variants[statusId]
      ) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-derived-variant-missing:${componentId}:${statusId}`,
            "Missing independent status variant",
            `${component.label} must own a direct ${status.label} variant while the capability is enabled.`,
          ),
        );
      }
    });

    if (
      capabilities.offlineMemo.enabled &&
      component.variants.offlineMemo &&
      !getStudioOfflineMemoTextNode(document, component)
    ) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `timetable-component-offline-memo-text:${componentId}`,
          "Missing Offline Memo text",
          `${component.label} needs one text object bound to day.offline_memo.`,
        ),
      );
    }
  });

  return diagnostics;
};

export const validateStudioDocument = (
  document: StudioTemplateDocument,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];
  const nodes = document.graph.nodes;
  const inputConsumers = collectStudioInputConsumers(document);

  diagnostics.push(...validateGraphIntegrity(document));

  (document.resources?.webFonts ?? []).forEach((source, index) => {
    if (
      !source ||
      typeof source.id !== "string" ||
      typeof source.label !== "string" ||
      typeof source.cssText !== "string" ||
      typeof source.enabled !== "boolean"
    ) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `web-font-invalid:${index}`,
          "Invalid web font source",
          `Web font source ${index + 1} is missing required fields.`,
        ),
      );
      return;
    }

    const parsed = parseStudioWebFontCss(source.cssText);
    if (!parsed.ok) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `web-font-css-invalid:${source.id}`,
          "Invalid web font CSS",
          `${source.label}: ${parsed.errors.map((error) => error.message).join(" ")}`,
        ),
      );
    }
  });

  document.graph.rootNodeIds.forEach((nodeId) => {
    if (!nodes[nodeId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `root-missing:${nodeId}`,
          "Missing root node",
          `${nodeId} is listed as a root node, but it does not exist in graph.nodes.`,
        ),
      );
    }
  });

  Object.values(nodes).forEach((node) => {
    if (node.styleId && !document.styles[node.styleId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `style-missing:${node.id}`,
          "Missing style reference",
          `${node.label} uses ${node.styleId}, but that style does not exist.`,
        ),
      );
    }

    const hiddenReasons = getGraphNodeHiddenReasons(document, node);
    if (hiddenReasons.length > 0) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `graph-node-hidden:${node.id}`,
          "Graph node may be hidden",
          `${node.label} may not render because ${hiddenReasons.join(", ")}.`,
        ),
      );
    }

    if (node.parentId && !nodes[node.parentId]) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `parent-missing:${node.id}`,
          "Missing parent reference",
          `${node.label} points to parent ${node.parentId}, but that node does not exist.`,
        ),
      );
    }

    node.childIds.forEach((childId) => {
      const child = nodes[childId];
      if (!child) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `child-missing:${node.id}:${childId}`,
            "Missing child reference",
            `${node.label} includes child ${childId}, but that node does not exist.`,
          ),
        );
        return;
      }

      if (child.parentId !== node.id) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `child-parent-mismatch:${node.id}:${childId}`,
            "Parent contract mismatch",
            `${child.label} is listed under ${node.label}, but its parentId is ${child.parentId ?? "null"}.`,
          ),
        );
      }
    });

    if (node.meta?.exception) {
      diagnostics.push(
        ...validateExceptionObjectMeta(
          document,
          node.id,
          node.label,
          node.meta.exception,
          "cards",
        ),
      );
    }

    diagnostics.push(
      ...validateBinding(document, node),
      ...validateGraphNodeAssetSlots(document, node),
    );
  });

  Object.values(document.inputs).forEach((input) => {
    const consumers = inputConsumers[input.id] ?? [];

    if (consumers.length === 0) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `input-unused:${input.id}`,
          "Input has no consumers",
          `${input.label} is defined but is not used by any Cards or Timetable object.`,
        ),
      );
    }

    if (
      input.scope !== "global" &&
      consumers.some((consumer) => consumer.workspace === "timetable")
    ) {
      const timetableConsumers = consumers
        .filter((consumer) => consumer.workspace === "timetable")
        .map((consumer) => `${consumer.label} (${consumer.detail})`)
        .join(", ");

      diagnostics.push(
        createDiagnostic(
          "warning",
          `input-scope-preview-context:${input.id}`,
          "Input scope may not match timetable preview context",
          `${input.label} is ${input.scope}-scoped but is consumed by timetable-level object(s): ${timetableConsumers}. Timetable-level objects resolve custom inputs without a day or entry runtime context, so this input will fall back to its default value there.`,
        ),
      );
    }

    if (input.scope !== "global" && !document.domains?.timetable) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `scope-domain-missing:${input.id}`,
          "Scoped input has no timetable domain",
          `${input.label} uses ${input.scope} scope, but this document has no timetable domain to provide runtime context.`,
        ),
      );
    }

    if (input.type === "select" && input.options.length === 0) {
      diagnostics.push(
        createDiagnostic(
          "error",
          `select-options-empty:${input.id}`,
          "Select input has no options",
          `${input.label} needs at least one option.`,
        ),
      );
    }
  });

  diagnostics.push(...validateTimetableDomain(document));

  return diagnostics.sort((a, b) => {
    if (a.severity === b.severity) return a.id.localeCompare(b.id);
    return a.severity === "error" ? -1 : 1;
  });
};
