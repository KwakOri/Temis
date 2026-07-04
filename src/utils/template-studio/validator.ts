import {
  StudioBinding,
  StudioDiagnostic,
  StudioGraphNode,
  StudioNodeId,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioBuiltinField } from "@/utils/template-studio/builtin-fields";
import {
  isStudioImageBinding,
  isStudioImageNode,
  isStudioTextBinding,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";

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

const getBindingInputId = (binding: StudioBinding): string | null => {
  if (
    binding.kind === "staticText" ||
    binding.kind === "staticAsset" ||
    binding.kind === "builtinField"
  ) {
    return null;
  }

  return binding.inputId;
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

  if (
    node.binding.kind === "builtinField" &&
    !getStudioBuiltinField(node.binding.fieldId)
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `binding-builtin-field-missing:${node.id}`,
        "Missing built-in field",
        `${node.label} is bound to ${node.binding.fieldId}, but that built-in field does not exist.`,
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
          `graph-orphan:${node.id}`,
          "Node is not reachable from roots",
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

  Object.entries(timetable.statuses).forEach(([statusId, status]) => {
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

  if (!timetable.statuses[timetable.defaultEntryStatusId]) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `timetable-default-status-missing:${timetable.defaultEntryStatusId}`,
        "Missing default entry status",
        `The timetable domain uses ${timetable.defaultEntryStatusId}, but that status does not exist.`,
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
      }

      if (!nodes[variant.rootNodeId]) {
        diagnostics.push(
          createDiagnostic(
            "error",
            `timetable-component-variant-root-missing:${componentId}:${variantStatusId}`,
            "Missing component variant root",
            `${component.label} ${variantStatusId} points to ${variant.rootNodeId}, but that node does not exist.`,
          ),
        );
      }
    });

    Object.entries(timetable.statuses).forEach(([statusId, status]) => {
      if (status.kind === "derived" && !component.variants[statusId]) {
        diagnostics.push(
          createDiagnostic(
            "warning",
            `timetable-component-derived-variant-missing:${componentId}:${statusId}`,
            "Derived component variant will use fallback",
            `${component.label} has no ${status.label} variant, so it will fall back to ${status.fallbackStatusId ?? status.baseStatus}.`,
          ),
        );
      }
    });
  });

  return diagnostics;
};

export const validateStudioDocument = (
  document: StudioTemplateDocument,
): StudioDiagnostic[] => {
  const diagnostics: StudioDiagnostic[] = [];
  const nodes = document.graph.nodes;

  diagnostics.push(...validateGraphIntegrity(document));

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

    diagnostics.push(...validateBinding(document, node));
  });

  Object.values(document.inputs).forEach((input) => {
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
