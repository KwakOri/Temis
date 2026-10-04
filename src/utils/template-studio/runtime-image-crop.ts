import type {
  StudioInputId,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  requireStudioTimetableGraphDocument,
  resolveStudioTimetableGraphGeometry,
} from "./timetable-graph-commands";
import {
  getStudioTimetableNodeIds,
  getStudioTimetableNodeExtension,
} from "./timetable-graph-queries";

export interface StudioRuntimeImageCropTarget {
  objectId: string;
  width: number;
  height: number;
}

export const getStudioRuntimeProfileImageCropTarget = (
  document: StudioTemplateDocument,
  inputId: StudioInputId,
): StudioRuntimeImageCropTarget | null => {
  if (document.version !== 8) return null;
  const graph = requireStudioTimetableGraphDocument(document);
  const node = [...getStudioTimetableNodeIds(graph)]
    .map((id) => graph.graph.nodes[id])
    .find(
      (candidate) =>
        candidate?.type === "image" &&
        getStudioTimetableNodeExtension(graph, candidate.id).profileRole ===
          "userImage" &&
        candidate.binding?.kind === "inputImage" &&
        candidate.binding.inputId === inputId,
    );
  if (!node) return null;
  const geometry = resolveStudioTimetableGraphGeometry(graph, node.id);
  if (geometry.width <= 0 || geometry.height <= 0) return null;
  return { objectId: node.id, width: geometry.width, height: geometry.height };
};

/** 어디에 넣을 사진인지 모를 때 쓰는 자르기 크기. */
export const STUDIO_RUNTIME_FALLBACK_CROP_SIZE = { width: 400, height: 400 };

/**
 * 미리보기용 사진을 자를 창의 크기를 정한다.
 *
 * 지금 고른 객체의 크기를 따라간다. 템플릿이 정한 자리와 다른 비율로 자르면
 * 미리보기가 실제 결과와 달라진다. 고른 것이 없을 때만 정사각으로 연다.
 */
export const resolveStudioRuntimeCropSize = (
  selectedGeometry: { width: number; height: number } | null | undefined,
): { width: number; height: number } =>
  selectedGeometry ?? STUDIO_RUNTIME_FALLBACK_CROP_SIZE;
