import { fetchFigmaGridCandidates } from "@/services/server/figmaTemplateStudioService";
import type {
  FigmaGridCandidateSource,
  StudioFigmaAnalyzeResponse,
  StudioFigmaGridCandidate,
} from "@/types/template-studio-figma";
import { parseFigmaDesignUrl } from "@/utils/template-studio/figma-import/figma-url";
import { NextRequest, NextResponse } from "next/server";

type AdminActorResult =
  { ok: true; userId: number } | { ok: false; response: Response };

type CandidateAdapter = (input: {
  candidates: FigmaGridCandidateSource[];
  warnings: string[];
}) => Promise<StudioFigmaGridCandidate[]> | StudioFigmaGridCandidate[];

const noGraphCandidatesYet: CandidateAdapter = async () => [];

export const createFigmaGridAnalyzeHandler = (dependencies: {
  requireActor: (request: NextRequest) => Promise<AdminActorResult>;
  toCandidates?: CandidateAdapter;
}) => {
  const graphConversionPending = !dependencies.toCandidates;
  const toCandidates = dependencies.toCandidates ?? noGraphCandidatesYet;

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
      const normalized = await fetchFigmaGridCandidates(source);
      const candidates = await toCandidates(normalized);
      const response: StudioFigmaAnalyzeResponse = {
        success: true,
        candidates,
        warnings:
          graphConversionPending && normalized.candidates.length > 0
            ? [
                ...normalized.warnings,
                "GRID sources were fetched; graph conversion is not connected yet.",
              ]
            : normalized.warnings,
      };
      return NextResponse.json(response);
    } catch {
      return NextResponse.json(
        { error: "Figma component analysis failed." },
        { status: 502 },
      );
    }
  };
};

export async function POST(request: NextRequest) {
  const { requireTemplateStudioAdminActor } =
    await import("@/app/api/admin/template-studio/_utils");
  return createFigmaGridAnalyzeHandler({
    requireActor: requireTemplateStudioAdminActor,
  })(request);
}
