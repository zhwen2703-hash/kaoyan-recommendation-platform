import type { EvidenceDimensions, NormalizedAdmissionMetrics, RecommendationScore } from "./types";

export type CandidateInput = {
  expectedScore: number | null;
  referenceLine: number | null;
  metrics: NormalizedAdmissionMetrics;
  evidence: EvidenceDimensions;
  enrollmentChange: number | null;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const confidenceFactor = { high: 1, medium: 0.82, low: 0.58 } as const;

export function scoreCandidate(input: CandidateInput): RecommendationScore {
  const scoreMargin = input.expectedScore != null && input.referenceLine != null
    ? input.expectedScore - input.referenceLine : null;
  const matchScore = scoreMargin == null ? 50 : clamp(50 + scoreMargin * 1.5);

  const available: Array<[number, number]> = [];
  if (input.metrics.firstChoiceRetestRatio != null) {
    available.push([0.5, clamp(100 - (input.metrics.firstChoiceRetestRatio - 1) * 100)]);
  }
  if (input.metrics.generalExamPlan != null) {
    available.push([0.35, clamp(20 + Math.log1p(input.metrics.generalExamPlan) * 18)]);
  }
  if (input.enrollmentChange != null) {
    available.push([0.15, clamp(50 + input.enrollmentChange * 5)]);
  }
  const validWeight = available.reduce((sum, [weight]) => sum + weight, 0);
  const competitionScore = validWeight
    ? available.reduce((sum, [weight, value]) => sum + weight * value, 0) / validWeight
    : 0;
  const confidenceScore = Math.round(confidenceFactor[input.evidence.confidence] * 100);
  let riskPenalty = 0;
  if (input.enrollmentChange != null && input.enrollmentChange < 0) riskPenalty += Math.min(15, Math.abs(input.enrollmentChange) * 2);
  if (input.metrics.firstChoiceRetestRatio != null && input.metrics.firstChoiceRetestRatio > 1.5) riskPenalty += 10;
  if (input.evidence.verification === "conflict") riskPenalty += 25;

  const effective = matchScore * 0.55 + competitionScore * 0.45;
  const finalScore = Math.round(clamp(effective * confidenceFactor[input.evidence.confidence] - riskPenalty));
  const missingCompetition = input.metrics.generalExamPlan == null && input.metrics.firstChoiceRetestRatio == null;
  const pending = !input.evidence.canClassifySafe || input.evidence.verification === "conflict" || missingCompetition;
  let riskLevel: RecommendationScore["riskLevel"] = pending ? "pending" : finalScore >= 75 ? "safe" : finalScore >= 55 ? "stable" : "reach";
  if (!pending && input.metrics.professionalLine == null && riskLevel === "safe") riskLevel = "stable";
  if (!pending && missingCompetition && (riskLevel === "safe" || riskLevel === "stable")) riskLevel = "reach";

  return {
    matchScore: Math.round(matchScore), competitionScore: Math.round(competitionScore),
    confidenceScore, riskPenalty, finalScore, riskLevel,
    trustedTopTenEligible: !pending && input.evidence.confidence !== "low",
  };
}
