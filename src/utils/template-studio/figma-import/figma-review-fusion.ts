import type {
  FigmaReviewCandidate,
  FigmaReviewAgreement,
  FigmaReviewDecision,
  FigmaReviewSource,
  FigmaSemanticEvidence,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import { bindingForFigmaRole } from "@/utils/template-studio/figma-import/figma-text-classifier";

const AUTO_ROLES = new Set(["day_label", "date", "time"]);
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const candidateFromReview = (review: StudioFigmaNodeReview): FigmaReviewCandidate => ({
  suggestedRole: review.suggestedRole,
  suggestedStudioType: review.suggestedStudioType,
  confidence: clamp(review.confidence),
  reason: review.reason,
});

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
  const stableEvidence = evidence !== undefined && evidence.mapping !== "ambiguous";
  const supportsAuto = AUTO_ROLES.has(ruleCandidate.suggestedRole) && stableEvidence;
  const decision: FigmaReviewDecision = !aiCandidate
    ? input.rule.decision
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
      ? clamp((ruleCandidate.confidence + aiCandidate.confidence) / 2 + (stableEvidence ? 0.05 : 0))
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
