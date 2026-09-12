import type {
  FigmaReviewCandidate,
  FigmaReviewAgreement,
  FigmaReviewDecision,
  FigmaReviewSource,
  FigmaSemanticEvidence,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import { bindingForFigmaRole } from "@/utils/template-studio/figma-import/figma-text-classifier";

const AUTO_SIGNALS: Partial<Record<StudioFigmaNodeReview["suggestedRole"], FigmaSemanticEvidence["signals"][number]>> = {
  day_label: "known_weekday_set",
  date: "date_pattern",
  time: "time_pattern",
};
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const candidateFromReview = (review: StudioFigmaNodeReview): FigmaReviewCandidate => ({
  suggestedRole: review.suggestedRole,
  suggestedStudioType: review.suggestedStudioType,
  confidence: clamp(review.confidence),
  reason: review.reason,
});

const hasAdequateRoleEvidence = (
  role: StudioFigmaNodeReview["suggestedRole"],
  evidence: FigmaSemanticEvidence | undefined,
): boolean => {
  const requiredSignal = AUTO_SIGNALS[role];
  if (!requiredSignal || !evidence || evidence.mapping === "ambiguous") return false;
  if (!evidence.signals.includes(requiredSignal) || evidence.matchedPlacementCount < 2 || evidence.samples.length < 2) return false;
  return role === "day_label" ? evidence.distinctValueCount >= 2 : evidence.distinctValueCount >= 1;
};

export const fuseFigmaReview = (input: {
  rule: StudioFigmaNodeReview;
  ai?: FigmaReviewCandidate;
  evidence?: FigmaSemanticEvidence;
}): StudioFigmaNodeReview => {
  const ruleCandidate = input.rule.ruleCandidate ?? candidateFromReview(input.rule);
  const aiCandidate = input.ai ? {
    ...input.ai,
    confidence: clamp(input.ai.confidence),
  } : undefined;
  if (input.rule.decision === "manual") return { ...input.rule, evidence: input.evidence ?? input.rule.evidence, ruleCandidate, aiCandidate };

  const agreement: FigmaReviewAgreement = !aiCandidate
    ? "rule_only"
    : ruleCandidate.suggestedRole === "unknown"
      ? "ai_only"
      : ruleCandidate.suggestedRole === aiCandidate.suggestedRole && ruleCandidate.suggestedStudioType === aiCandidate.suggestedStudioType
        ? "agree"
        : "disagree";
  const source: FigmaReviewSource = aiCandidate ? "hybrid" : "rule";
  const evidence = input.evidence ?? input.rule.evidence;
  const supportsAuto = hasAdequateRoleEvidence(ruleCandidate.suggestedRole, evidence);
  const decision: FigmaReviewDecision = !aiCandidate
    ? input.rule.decision === "auto" && !supportsAuto
      ? "needs_review"
      : input.rule.decision
    : agreement === "agree" && supportsAuto
      ? "auto"
      : "needs_review";
  const effectiveRole = agreement === "disagree" ? ruleCandidate.suggestedRole : aiCandidate?.suggestedRole ?? ruleCandidate.suggestedRole;
  const effectiveType = agreement === "disagree" ? ruleCandidate.suggestedStudioType : aiCandidate?.suggestedStudioType ?? ruleCandidate.suggestedStudioType;
  const suggestedBinding = agreement === "disagree"
    ? input.rule.suggestedBinding
    : bindingForFigmaRole(effectiveRole, input.rule.sourceCharacters ?? "");
  const confidence = aiCandidate
    ? agreement === "agree"
      ? clamp((ruleCandidate.confidence + aiCandidate.confidence) / 2 + (supportsAuto ? 0.05 : 0))
      : clamp(Math.max(ruleCandidate.confidence, aiCandidate.confidence * 0.5))
    : clamp(ruleCandidate.confidence);
  return {
    ...input.rule,
    suggestedRole: effectiveRole,
    suggestedStudioType: effectiveType,
    suggestedBinding,
    confidence,
    source,
    decision,
    agreement,
    evidence,
    ruleCandidate,
    aiCandidate,
    reason: aiCandidate ? `${ruleCandidate.reason} AI: ${aiCandidate.reason}` : ruleCandidate.reason,
  };
};
