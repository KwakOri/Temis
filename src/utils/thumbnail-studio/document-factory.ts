import type { StudioTemplateDocument } from "@/types/template-studio";
import { STUDIO_TEMPLATE_DOCUMENT_VERSION } from "@/utils/template-studio/migrations";

export const THUMBNAIL_STUDIO_DEFAULT_CANVAS = {
  width: 1280,
  height: 720,
  background: "#ffffff",
} as const;

export interface ThumbnailCanvasPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const THUMBNAIL_CANVAS_PRESETS: ThumbnailCanvasPreset[] = [
  { id: "youtube", label: "YouTube", width: 1280, height: 720 },
  { id: "landscape-card", label: "가로형 카드", width: 1200, height: 630 },
  { id: "square", label: "정사각형", width: 1080, height: 1080 },
  { id: "portrait", label: "세로형", width: 1080, height: 1350 },
];

export interface CreateThumbnailStudioDocumentOptions {
  name?: string;
  description?: string;
  width?: number;
  height?: number;
  background?: string;
  transparentBackground?: boolean;
}

/**
 * 빈 썸네일 문서를 만든다.
 *
 * 캔버스 자체를 표현하기 위한 root node를 만들지 않는다. 사용자가 추가한
 * 노드만 graph에 들어간다. 시간표 도메인은 생성하지 않는다.
 */
export const createThumbnailStudioDocument = (
  options: CreateThumbnailStudioDocumentOptions = {},
): StudioTemplateDocument => ({
  schema: "studio_template_document",
  version: STUDIO_TEMPLATE_DOCUMENT_VERSION,
  metadata: {
    editor: "template-studio",
    kind: "thumbnail",
    name: options.name?.trim() || "Untitled Thumbnail",
    ...(options.description ? { description: options.description } : {}),
  },
  canvas: {
    width: options.width ?? THUMBNAIL_STUDIO_DEFAULT_CANVAS.width,
    height: options.height ?? THUMBNAIL_STUDIO_DEFAULT_CANVAS.height,
    background:
      options.background ?? THUMBNAIL_STUDIO_DEFAULT_CANVAS.background,
  },
  graph: {
    rootNodeIds: [],
    nodes: {},
  },
  inputs: {},
  styles: {},
  assets: {},
  domains: {
    thumbnail: {
      version: 1,
      export: {
        defaultFormat: "png",
        transparentBackground: options.transparentBackground ?? false,
      },
    },
  },
});
