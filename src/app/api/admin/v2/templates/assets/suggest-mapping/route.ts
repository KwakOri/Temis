import { requireAdmin } from "@/lib/auth/middleware";
import { NextRequest, NextResponse } from "next/server";

type SuggestionItem = {
  fileName: string;
  key: string | null;
  confidence: number;
  reason: string;
  source: "ai" | "fallback";
};

type SuggestResponse = {
  suggestions: SuggestionItem[];
  model?: string;
  usedFallback: boolean;
};

const OPENAI_SUGGEST_MODEL = "gpt-4o-mini";

const normalizeToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildCandidateIndex = (candidateKeys: string[]) => {
  const normalizedToKey = new Map<string, string>();
  candidateKeys.forEach((key) => {
    const normalized = normalizeToken(key);
    if (!normalized) return;
    if (!normalizedToKey.has(normalized)) {
      normalizedToKey.set(normalized, key);
    }
  });
  return normalizedToKey;
};

const scoreByTokenOverlap = (input: string, candidate: string): number => {
  const inputTokens = new Set(input.split("_").filter(Boolean));
  const candidateTokens = new Set(candidate.split("_").filter(Boolean));
  if (inputTokens.size === 0 || candidateTokens.size === 0) return 0;

  let overlap = 0;
  inputTokens.forEach((token) => {
    if (candidateTokens.has(token)) overlap += 1;
  });

  const union = new Set([...inputTokens, ...candidateTokens]).size;
  return union > 0 ? overlap / union : 0;
};

const fallbackSuggest = ({
  fileNames,
  candidateKeys,
}: {
  fileNames: string[];
  candidateKeys: string[];
}): SuggestResponse => {
  const normalizedIndex = buildCandidateIndex(candidateKeys);
  const normalizedCandidates = candidateKeys.map((key) => ({
    key,
    normalized: normalizeToken(key),
  }));

  const suggestions = fileNames.map<SuggestionItem>((fileName) => {
    const normalizedFileName = normalizeToken(fileName);
    const exactKey = normalizedIndex.get(normalizedFileName);
    if (exactKey) {
      return {
        fileName,
        key: exactKey,
        confidence: 0.96,
        reason: "파일명과 자산 키가 정확히 일치합니다.",
        source: "fallback",
      };
    }

    let bestKey: string | null = null;
    let bestScore = -1;
    for (const { key, normalized } of normalizedCandidates) {
      const score = scoreByTokenOverlap(normalizedFileName, normalized);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    if (!bestKey || bestScore < 0.5) {
      return {
        fileName,
        key: null,
        confidence: 0,
        reason: "자동 매칭 근거가 부족하여 수동 확인이 필요합니다.",
        source: "fallback",
      };
    }

    return {
      fileName,
      key: bestKey,
      confidence: Number(Math.min(0.8, Math.max(0.5, bestScore)).toFixed(2)),
      reason: "파일명 토큰 유사도로 추정했습니다.",
      source: "fallback",
    };
  });

  return {
    suggestions,
    usedFallback: true,
  };
};

const tryOpenAiSuggest = async ({
  fileNames,
  candidateKeys,
  apiKey,
}: {
  fileNames: string[];
  candidateKeys: string[];
  apiKey: string;
}): Promise<SuggestResponse | null> => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_SUGGEST_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You map image file names to the most likely asset key. Return strict JSON only with {\"suggestions\":[{\"fileName\":string,\"key\":string|null,\"confidence\":number,\"reason\":string}]}. key must be one of provided candidateKeys or null.",
          },
          {
            role: "user",
            content: JSON.stringify({
              fileNames,
              candidateKeys,
              instruction:
                "Prefer exact or day-specific matches (online_mon..sun/offline_mon..sun). Use null when uncertain.",
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      suggestions?: Array<{
        fileName?: unknown;
        key?: unknown;
        confidence?: unknown;
        reason?: unknown;
      }>;
    };

    const candidateKeySet = new Set(candidateKeys);
    const suggestions = (parsed.suggestions ?? [])
      .map((item): SuggestionItem | null => {
        const fileName = typeof item.fileName === "string" ? item.fileName : "";
        const key =
          typeof item.key === "string" && candidateKeySet.has(item.key)
            ? item.key
            : null;
        const confidenceRaw =
          typeof item.confidence === "number" && Number.isFinite(item.confidence)
            ? item.confidence
            : 0;
        const confidence = Number(Math.max(0, Math.min(1, confidenceRaw)).toFixed(2));
        const reason =
          typeof item.reason === "string" && item.reason.trim().length > 0
            ? item.reason.trim()
            : "AI 매칭 결과";
        if (!fileName) return null;
        return {
          fileName,
          key,
          confidence,
          reason,
          source: "ai",
        };
      })
      .filter((item) => item !== null) as SuggestionItem[];

    if (suggestions.length === 0) return null;

    const suggestionByFileName = new Map(
      suggestions.map((item) => [item.fileName, item])
    );

    const normalized = fileNames.map<SuggestionItem>((fileName) => {
      const matched = suggestionByFileName.get(fileName);
      if (matched) return matched;
      return {
        fileName,
        key: null,
        confidence: 0,
        reason: "AI가 해당 파일을 매칭하지 못했습니다.",
        source: "ai",
      };
    });

    return {
      suggestions: normalized,
      model: OPENAI_SUGGEST_MODEL,
      usedFallback: false,
    };
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = (await request.json()) as {
      fileNames?: unknown;
      candidateKeys?: unknown;
    };

    const fileNames = Array.isArray(body.fileNames)
      ? body.fileNames.filter((item): item is string => typeof item === "string")
      : [];
    const candidateKeys = Array.isArray(body.candidateKeys)
      ? body.candidateKeys.filter((item): item is string => typeof item === "string")
      : [];

    if (fileNames.length === 0) {
      return NextResponse.json(
        { error: "fileNames가 비어 있습니다." },
        { status: 400 }
      );
    }

    if (candidateKeys.length === 0) {
      return NextResponse.json(
        { error: "candidateKeys가 비어 있습니다." },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_ACCESS_TOKEN || process.env.OPENAI_API_KEY;

    if (typeof openAiKey === "string" && openAiKey.trim().length > 0) {
      const aiResult = await tryOpenAiSuggest({
        fileNames,
        candidateKeys,
        apiKey: openAiKey.trim(),
      });
      if (aiResult) {
        return NextResponse.json({
          success: true,
          ...aiResult,
        });
      }
    }

    const fallback = fallbackSuggest({ fileNames, candidateKeys });
    return NextResponse.json({
      success: true,
      ...fallback,
    });
  } catch (error) {
    console.error("Admin v2 asset mapping suggest error:", error);
    return NextResponse.json(
      { error: "에셋 자동 매칭 제안 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
