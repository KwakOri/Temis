import {
  fetchFigmaGridOriginCandidates,
  FigmaGridScopeError,
} from "@/services/server/figmaTemplateStudioService";
import {
  reviewFigmaGridNodesWithWarnings,
  type FigmaGridReviewRequest,
  type FigmaGridReviewResult,
  type FigmaReviewInput,
} from "@/services/server/figmaGridReviewService";
import type {
  FigmaGridCandidateSource,
  StudioFigmaAnalyzeResponse,
  StudioFigmaGridCandidate,
} from "@/types/template-studio-figma";
import {
  convertFigmaGridOriginCandidate,
  type StudioFigmaGridOriginCandidate,
} from "@/utils/template-studio/figma-import/figma-node-converter";
import { parseFigmaDesignUrl } from "@/utils/template-studio/figma-import/figma-url";
import { NextRequest, NextResponse } from "next/server";

type AdminActorResult =
  { ok: true; userId: number } | { ok: false; response: Response };

type CandidateAdapter = (input: {
  candidates: FigmaGridCandidateSource[];
  warnings: string[];
}) => Promise<Array<StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate>> | Array<StudioFigmaGridCandidate | StudioFigmaGridOriginCandidate>;

type ReviewNodes = (nodes: FigmaReviewInput[]) => Promise<FigmaGridReviewResult>;
type ReviewNodesWithContext = (input: FigmaGridReviewRequest) => Promise<FigmaGridReviewResult>;

const convertCandidates: CandidateAdapter = ({ candidates }) =>
  candidates.map((candidate) => {
    const converted = convertFigmaGridOriginCandidate({
      label: candidate.label,
      frame: candidate.frame,
      placementInstanceIds: candidate.placementInstanceIds,
      variants: Object.fromEntries((Object.entries(candidate.variants) as Array<[
        "online" | "offline",
        FigmaGridCandidateSource["variants"]["online"],
      ]>).map(([status, variant]) => [status, {
        status,
        origin: variant.origin,
        root: variant.root,
        reviews: (variant as typeof variant & { reviews?: FigmaGridCandidateSource["reviews"] }).reviews ?? candidate.reviews ?? [],
        exportedAssets: variant.assets,
      }])) as unknown as Parameters<typeof convertFigmaGridOriginCandidate>[0]["variants"],
    });
    const online = converted.variants.online;
    return {
      ...converted,
      // Keep the pre-Task-5 public projection readable for existing callers;
      // the nested variants remain the source of truth for the new flow.
      component: online.component,
      reviews: online.reviews,
      reviewNodeIds: online.reviewNodeIds,
      reviewDefaults: online.reviewDefaults,
      warnings: [...candidate.warnings, ...converted.warnings],
    };
  });

const toReviewInputs = (
  node: FigmaGridCandidateSource["root"],
  evidenceBySourceNodeId: FigmaGridCandidateSource["variants"]["online"]["placementEvidence"] = {},
  componentSetEvidence: FigmaGridCandidateSource["variants"]["online"]["placementEvidence"] = {},
): FigmaReviewInput[] => {
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
      evidence: evidenceBySourceNodeId[node.id],
      componentSetEvidence: componentSetEvidence[node.id],
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
    ...(node.children?.flatMap((child) => toReviewInputs(child, evidenceBySourceNodeId, componentSetEvidence)) ?? []),
  ];
};

export const createFigmaGridAnalyzeHandler = (dependencies: {
  requireActor: (request: NextRequest) => Promise<AdminActorResult>;
  toCandidates?: CandidateAdapter;
  reviewNodes?: ReviewNodes;
  reviewNodesWithContext?: ReviewNodesWithContext;
}) => {
  const toCandidates = dependencies.toCandidates ?? convertCandidates;

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
      const reviewedCandidates = await Promise.all(normalized.candidates.map(async (candidate) => {
        const reviewedVariants = {} as FigmaGridCandidateSource["variants"];
        const reviewWarnings: string[] = [];
        for (const status of ["online", "offline"] as const) {
          const variant = candidate.variants[status];
          const reviewInputs = toReviewInputs(variant.root, variant.placementEvidence, variant.componentSetEvidence);
          const reviewResult = dependencies.reviewNodesWithContext
            ? await dependencies.reviewNodesWithContext({
              nodes: reviewInputs,
              evidenceBySourceNodeId: variant.placementEvidence,
              componentSetContext: variant.componentSetEvidence,
            })
            : dependencies.reviewNodes
              ? await dependencies.reviewNodes(reviewInputs)
              : await reviewFigmaGridNodesWithWarnings({
                nodes: reviewInputs,
                evidenceBySourceNodeId: variant.placementEvidence,
                componentSetContext: variant.componentSetEvidence,
              });
          reviewedVariants[status] = { ...variant, reviews: reviewResult.reviews } as typeof reviewedVariants[typeof status] & { reviews: typeof reviewResult.reviews };
          reviewWarnings.push(...reviewResult.warnings);
        }
        return {
          ...candidate,
          variants: reviewedVariants,
          root: reviewedVariants.online.root,
          assets: reviewedVariants.online.assets,
          reviews: (reviewedVariants.online as typeof reviewedVariants.online & { reviews: FigmaGridCandidateSource["reviews"] }).reviews,
          warnings: [...candidate.warnings, ...reviewWarnings],
        };
      }));
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
        candidates: candidates as StudioFigmaGridCandidate[],
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
