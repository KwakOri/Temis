import type {
  FigmaReviewCandidate,
  FigmaReviewAgreement,
  FigmaReviewDecision,
  FigmaReviewSource,
  FigmaSemanticEvidence,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import { bindingForFigmaRole } from "@/utils/template-studio/figma-import/figma-text-classifier";

const AUTO_ROLES = new Set(["day_label", "date", "time", "status_label"]);

const candidateFromReview = (review: StudioFigmaNodeReview): FigmaReviewCandidate => ({
  suggestedRole: review.suggestedRole,
  suggestedStudioType: review.suggestedStudioType,
  confidence: review.confidence,
  reason: review.reason,
});

const validCandidate = (candidate: FigmaReviewCandidate): boolean =>
  Number.isFinite(candidate.confidence) && candidate.confidence >= 0 && candidate.confidence <= 1;

export const fuseFigmaReview = (input: {
  rule: StudioFigmaNodeReview;
  ai?: FigmaReviewCandidate;
  evidence?: FigmaSemanticEvidence;
}): StudioFigmaNodeReview => {
  const ruleCandidate = input.rule.ruleCandidate ?? candidateFromReview(input.rule);
  const aiCandidate = input.ai && validCandidate(input.ai) ? input.ai : undefined;
  const agreement: FigmaReviewAgreement = !aiCandidate
    ? "rule_only"
    : ruleCandidate.suggestedRole === "unknown"
      ? "ai_only"
    : ruleCandidate.suggestedRole === aiCandidate.suggestedRole &&
      ruleCandidate.suggestedStudioType === aiCandidate.suggestedStudioType
      ? "agree"
      : "disagree";
  const source: FigmaReviewSource = aiCandidate ? "hybrid" : "rule";
  const stableEvidence = input.evidence !== undefined && input.evidence.mapping !== "ambiguous";
  const decision: FigmaReviewDecision = aiCandidate
    ? agreement === "agree" && AUTO_ROLES.has(ruleCandidate.suggestedRole) && stableEvidence
      ? "auto"
      : "needs_review"
    : input.rule.decision;
  const effectiveRole = agreement === "disagree" ? ruleCandidate.suggestedRole : aiCandidate?.suggestedRole ?? ruleCandidate.suggestedRole;
  const effectiveType = agreement === "disagree" ? ruleCandidate.suggestedStudioType : aiCandidate?.suggestedStudioType ?? ruleCandidate.suggestedStudioType;
  return {
    ...input.rule,
    suggestedRole: effectiveRole,
    suggestedStudioType: effectiveType,
    suggestedBinding: aiCandidate && agreement !== "disagree"
      ? bindingForFigmaRole(effectiveRole, input.rule.sourceCharacters ?? "")
      : input.rule.suggestedBinding.kind === "builtinField"
      ? bindingForFigmaRole(effectiveRole, input.rule.sourceCharacters ?? "")
      : input.rule.suggestedBinding,
    confidence: Math.max(ruleCandidate.confidence, aiCandidate?.confidence ?? 0),
    source,
    decision,
    agreement,
    evidence: input.evidence,
    ruleCandidate,
    aiCandidate,
    reason: aiCandidate ? `${ruleCandidate.reason} AI: ${aiCandidate.reason}` : ruleCandidate.reason,
  };
};
