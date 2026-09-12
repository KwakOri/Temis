import {
  fetchFigmaGridOriginCandidates,
  FigmaGridScopeError,
} from "@/services/server/figmaTemplateStudioService";
import {
  reviewFigmaGridNodesWithWarnings,
  type FigmaGridReviewResult,
  type FigmaReviewInput,
} from "@/services/server/figmaGridReviewService";
import type {
  FigmaGridCandidateSource,
  StudioFigmaAnalyzeResponse,
  StudioFigmaGridCandidate,
} from "@/types/template-studio-figma";
import { convertFigmaGridCandidate } from "@/utils/template-studio/figma-import/figma-node-converter";
import { parseFigmaDesignUrl } from "@/utils/template-studio/figma-import/figma-url";
import { NextRequest, NextResponse } from "next/server";

type AdminActorResult =
  { ok: true; userId: number } | { ok: false; response: Response };

type CandidateAdapter = (input: {
  candidates: FigmaGridCandidateSource[];
  warnings: string[];
}) => Promise<StudioFigmaGridCandidate[]> | StudioFigmaGridCandidate[];

type ReviewNodes = (nodes: FigmaReviewInput[]) => Promise<FigmaGridReviewResult>;

const convertCandidates: CandidateAdapter = ({ candidates }) =>
  candidates.map((candidate) => {
    const converted = convertFigmaGridCandidate({
      root: candidate.root,
      reviews: candidate.reviews ?? [],
      exportedAssets: candidate.assets,
    });
    return {
      ...converted,
      warnings: [...candidate.warnings, ...converted.warnings],
    };
  });

const toReviewInputs = (node: FigmaGridCandidateSource["root"]): FigmaReviewInput[] => {
  const fills = node.fills ?? [];
  return [
    {
      id: node.id,
      name: node.name,
      type: node.type,
      characters: node.characters,
      textAutoResize: node.textAutoResize,
      layoutSizingHorizontal: node.layoutSizingHorizontal,
      layoutSizingVertical: node.layoutSizingVertical,
      layoutMode: node.layoutMode,
      visible: node.visible,
      opacity: node.opacity,
      absoluteBounds: node.absoluteBounds,
      styleFlags: {
        hasSolidFill: fills.some(
          (fill) =>
            fill &&
            typeof fill === "object" &&
            "type" in fill &&
            (fill as { type?: unknown }).type === "SOLID",
        ),
        hasImageFill: fills.some(
          (fill) =>
            fill &&
            typeof fill === "object" &&
            "type" in fill &&
            (fill as { type?: unknown }).type === "IMAGE",
        ),
        hasEffectsOrStrokes: (node.effects?.length ?? 0) > 0 || (node.strokes?.length ?? 0) > 0,
        hasChildren: (node.children?.length ?? 0) > 0,
      },
    },
    ...(node.children?.flatMap(toReviewInputs) ?? []),
  ];
};

export const createFigmaGridAnalyzeHandler = (dependencies: {
  requireActor: (request: NextRequest) => Promise<AdminActorResult>;
  toCandidates?: CandidateAdapter;
  reviewNodes?: ReviewNodes;
}) => {
  const toCandidates = dependencies.toCandidates ?? convertCandidates;
  const reviewNodes = dependencies.reviewNodes ?? reviewFigmaGridNodesWithWarnings;

  return async (request: Pick<Request, "json">): Promise<Response> => {
    const actor = await dependencies.requireActor(request as NextRequest);
    if (!actor.ok) return actor.response;

    let figmaUrl: string;
    try {
      const body = await request.json();
      figmaUrl =
        body &&
        typeof body === "object" &&
        typeof (body as Record<string, unknown>).figmaUrl === "string"
          ? (body as Record<string, string>).figmaUrl
          : "";
    } catch {
      figmaUrl = "";
    }

    if (!figmaUrl.trim()) {
      return NextResponse.json(
        { error: "Figma design link is required." },
        { status: 400 },
      );
    }

    const source = parseFigmaDesignUrl(figmaUrl);
    if (!source) {
      return NextResponse.json(
        { error: "A valid Figma design link is required." },
        { status: 400 },
      );
    }

    if (!process.env.FIGMA_ACCESS_TOKEN?.trim()) {
      return NextResponse.json(
        { error: "Figma analysis is not configured." },
        { status: 503 },
      );
    }

    try {
      const normalized = await fetchFigmaGridOriginCandidates(source);
      const reviewedCandidates = await Promise.all(
        normalized.candidates.map(async (candidate) => {
          const reviewResult = await reviewNodes(toReviewInputs(candidate.root));
          return {
            ...candidate,
            reviews: reviewResult.reviews,
            warnings: [...candidate.warnings, ...reviewResult.warnings],
          };
        }),
      );
      const warnings = [
        ...normalized.warnings,
        ...reviewedCandidates.flatMap((candidate) => candidate.warnings),
      ];
      const candidates = await toCandidates({
        candidates: reviewedCandidates,
        warnings,
      });
      const responseWarnings = [...new Set([
        ...warnings,
        ...candidates.flatMap((candidate) => candidate.warnings),
      ])];
      const response: StudioFigmaAnalyzeResponse = {
        success: true,
        candidates,
        warnings: responseWarnings,
      };
      return NextResponse.json(response);
    } catch (error) {
      if (error instanceof FigmaGridScopeError) {
        return NextResponse.json(
          { error: "The selected node must be a supported GRID component." },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: "Figma component analysis failed." },
        { status: 502 },
      );
    }
  };
};
