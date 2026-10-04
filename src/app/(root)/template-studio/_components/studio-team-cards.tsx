"use client";
import React from "react";
import type { StudioRuntimeValues } from "@/types/template-studio";
import type { StudioTimetableGraphDocument } from "@/types/studio-timetable-graph";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import {
  getStudioTeamCells,
  getStudioTeamCellRuntime,
} from "@/utils/template-studio/team-timetable";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "@/utils/template-studio/timetable-graph-presets";
import { resolveStudioTimetableGraphGeometry } from "@/utils/template-studio/timetable-graph-commands";
import { getStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import { getStudioTimetableComponentFrame } from "@/utils/template-studio/entry-groups";
import { resolveStudioTimetableComponentVariant } from "@/utils/template-studio/timetable-runtime";
import { createStudioStatusCardBackgroundSlotResolver } from "@/utils/template-studio/status-card-background";
import { getStudioCssOpacity } from "@/utils/template-studio/object-style";

export function StudioTeamCards({
  document,
  runtimeValues,
  selected,
  onSelect,
}: {
  document: StudioTimetableGraphDocument;
  runtimeValues: StudioRuntimeValues;
  selected: boolean;
  onSelect?: () => void;
}) {
  const id = STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
  const bounds = resolveStudioTimetableGraphGeometry(document, id);
  const style = document.styles[document.graph.nodes[id].styleId ?? ""] ?? {};
  return (
    <div
      data-node-id={id}
      data-team-generator
      className="absolute"
      onClick={onSelect}
      style={{
        ...bounds,
        opacity: getStudioCssOpacity(style.opacity),
        transform:
          typeof style.rotateDeg === "number"
            ? `rotate(${style.rotateDeg}deg)`
            : undefined,
        transformOrigin: "center",
        outline: selected ? "3px solid #10b981" : undefined,
      }}
    >
      {getStudioTeamCells(document, runtimeValues).map((cell) => {
        const day = runtimeValues.team?.members[cell.slotId]?.days[cell.dayId];
        const count =
          day?.status === "online" ? Math.max(1, day.entries.length) : 1;
        const component = getStudioTimetableDayComponent(document, cell.dayId);
        const frame = getStudioTimetableComponentFrame(document, component);
        return (
          <React.Fragment key={`${cell.slotId}:${cell.dayId}`}>
            {cell.memberHeaderWidth > 0 &&
              cell.dayId === document.domains.timetable.dayIds[0] &&
              (() => {
                const values = getStudioTeamCellRuntime(
                  document,
                  runtimeValues,
                  cell.slotId,
                  cell.dayId,
                );
                const root = component?.variants.online?.rootNodeId;
                const children = root
                  ? (document.graph.nodes[root]?.childIds ?? [])
                  : [];
                const memberRoots = children.filter((id) => {
                  const binding = document.graph.nodes[id]?.binding;
                  return (
                    binding?.kind === "inputText" &&
                    binding.inputId ===
                      document.domains.timetable.team?.memberNameInputId
                  );
                });
                return (
                  <div
                    data-team-member-header={cell.slotId}
                    className="absolute overflow-hidden"
                    style={{
                      left: 0,
                      top: cell.top,
                      width: cell.memberHeaderWidth,
                      height: cell.height,
                    }}
                  >
                    <div
                      style={{
                        width: frame.width,
                        height: frame.height,
                        transform: `scale(${cell.memberHeaderWidth / frame.width})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <StudioRenderer
                        document={document}
                        runtimeValues={values}
                        rootNodeIds={memberRoots}
                        runtimeContext={{ dayId: cell.dayId, entryIndex: 0 }}
                      />
                    </div>
                  </div>
                );
              })()}
            <div
              data-team-cell={`${cell.slotId}:${cell.dayId}`}
              data-status={day?.status ?? "missing"}
              className="absolute overflow-hidden"
              style={{
                left: cell.left,
                top: cell.top,
                width: cell.width,
                height: cell.height,
              }}
            >
              {Array.from({ length: count }, (_, index) => {
                const values = getStudioTeamCellRuntime(
                  document,
                  runtimeValues,
                  cell.slotId,
                  cell.dayId,
                  index,
                );
                const resolution = resolveStudioTimetableComponentVariant(
                  document,
                  component,
                  day?.status ?? "missing",
                );
                const height = cell.height / count;
                const scale = Math.min(
                  cell.width / frame.width,
                  height / frame.height,
                );
                const rootStyle = resolution
                  ? document.styles[
                      document.graph.nodes[resolution.variant.rootNodeId]
                        ?.styleId ?? ""
                    ]
                  : undefined;
                return resolution ? (
                  <div
                    key={index}
                    data-team-entry={index}
                    className="absolute overflow-hidden"
                    style={{
                      left: 0,
                      top: height * index,
                      width: cell.width,
                      height,
                      backgroundColor: String(
                        rootStyle?.backgroundColor ?? "transparent",
                      ),
                      borderRadius:
                        typeof rootStyle?.borderRadius === "number"
                          ? rootStyle.borderRadius * scale
                          : rootStyle?.borderRadius,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        left: (cell.width - frame.width * scale) / 2,
                        top: (height - frame.height * scale) / 2,
                        width: frame.width,
                        height: frame.height,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        className="absolute"
                        style={{ left: -frame.left, top: -frame.top }}
                      >
                        <StudioRenderer
                          showImagePlaceholders={false}
                          document={document}
                          runtimeValues={values}
                          rootNodeIds={[resolution.variant.rootNodeId]}
                          runtimeContext={{ dayId: cell.dayId, entryIndex: 0 }}
                          resolveNodeBackgroundAssetSlot={createStudioStatusCardBackgroundSlotResolver(
                            document,
                            values,
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
