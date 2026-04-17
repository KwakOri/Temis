import {
  V2TemplateBuiltinAssetKey,
  V2TemplateDayKey,
} from "@/types/time-table/template-render-config";

type V2DayAliasMap = Record<string, V2TemplateDayKey>;

export type V2AssetAliasRule = {
  key: string;
  aliases: string[];
};

export const v2_DAY_ALIAS_TO_KEY: V2DayAliasMap = {
  mon: "mon",
  monday: "mon",
  월: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  화: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  수: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  목: "thu",
  fri: "fri",
  friday: "fri",
  금: "fri",
  sat: "sat",
  saturday: "sat",
  토: "sat",
  sun: "sun",
  sunday: "sun",
  일: "sun",
};

export const v2_BUILTIN_ASSET_ALIAS_RULES: Array<{
  key: V2TemplateBuiltinAssetKey;
  aliases: string[];
}> = [
  { key: "bgByTheme", aliases: ["bg", "background", "scene_bg", "base_bg"] },
  { key: "topObjectByTheme", aliases: ["top", "topobject", "top_object"] },
  { key: "memoByTheme", aliases: ["memo", "note", "postit"] },
  {
    key: "artist",
    aliases: ["artist_object", "artistobject", "artist", "artist_image", "artist_bg"],
  },
  { key: "onlineByTheme", aliases: ["online", "card_online", "on"] },
  { key: "offlineByTheme", aliases: ["offline", "card_offline", "off"] },
  { key: "profileFrameByTheme", aliases: ["profile_frame", "frame", "artist_frame"] },
  {
    key: "profileBgByTheme",
    aliases: ["profile_bg", "profile_dummy", "profile_image", "dummy_profile"],
  },
  { key: "guideByTheme", aliases: ["guide", "overlay", "guide_overlay"] },
];

export const v2_normalizeAssetToken = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const v2_extractDayKeyFromAssetToken = (
  normalizedName: string
): V2TemplateDayKey | null => {
  const tokens = normalizedName.split("_").filter(Boolean);
  for (const token of tokens) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) continue;
    const dayKey = v2_DAY_ALIAS_TO_KEY[normalized];
    if (dayKey) return dayKey;
  }
  return null;
};

export const v2_scoreAssetTokenOverlap = (
  input: string,
  candidate: string
): number => {
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

export const v2_suggestAssetKeyByRule = ({
  fileName,
  candidateKeys,
  aliasRules = v2_BUILTIN_ASSET_ALIAS_RULES,
}: {
  fileName: string;
  candidateKeys: string[];
  aliasRules?: V2AssetAliasRule[];
}): { key: string; confidence: number; reason: string } | null => {
  const normalizedName = v2_normalizeAssetToken(fileName);
  if (!normalizedName) return null;

  const candidateByNormalized = new Map<string, string>();
  candidateKeys.forEach((candidateKey) => {
    const normalizedCandidate = v2_normalizeAssetToken(candidateKey);
    if (!normalizedCandidate) return;
    if (!candidateByNormalized.has(normalizedCandidate)) {
      candidateByNormalized.set(normalizedCandidate, candidateKey);
    }
  });

  const exactKey = candidateByNormalized.get(normalizedName);
  if (exactKey) {
    return {
      key: exactKey,
      confidence: 1,
      reason: "파일명과 키가 정확히 일치합니다.",
    };
  }

  const dayKey = v2_extractDayKeyFromAssetToken(normalizedName);
  const hasToken = (...tokens: string[]) =>
    tokens.some((token) => normalizedName.includes(token));
  if (dayKey && hasToken("offline_memo", "offlinememo", "memo_offline", "memooffline")) {
    const matched = candidateByNormalized.get(`offlinememo_${dayKey}`);
    if (matched) {
      return {
        key: matched,
        confidence: 0.95,
        reason: "offlineMemo + 요일 토큰 규칙으로 매칭했습니다.",
      };
    }
  }
  if (dayKey && hasToken("multi", "multiple", "online_multi", "onlinemulti")) {
    const matched = candidateByNormalized.get(`multi_${dayKey}`);
    if (matched) {
      return {
        key: matched,
        confidence: 0.95,
        reason: "multi + 요일 토큰 규칙으로 매칭했습니다.",
      };
    }
  }
  if (dayKey && normalizedName.includes("online")) {
    const matched = candidateByNormalized.get(`online_${dayKey}`);
    if (matched) {
      return {
        key: matched,
        confidence: 0.94,
        reason: "online + 요일 토큰 규칙으로 매칭했습니다.",
      };
    }
  }
  if (dayKey && normalizedName.includes("offline")) {
    const matched = candidateByNormalized.get(`offline_${dayKey}`);
    if (matched) {
      return {
        key: matched,
        confidence: 0.94,
        reason: "offline + 요일 토큰 규칙으로 매칭했습니다.",
      };
    }
  }

  for (const rule of aliasRules) {
    if (!candidateKeys.includes(rule.key)) continue;
    if (
      rule.aliases.some(
        (alias) => normalizedName === alias || normalizedName.includes(alias)
      )
    ) {
      return {
        key: rule.key,
        confidence: 0.88,
        reason: `기본 이름 규칙(${rule.aliases[0]})으로 매칭했습니다.`,
      };
    }
  }

  return null;
};
