import type { MajorOffering } from "./types";
import { deriveEvidenceDimensions } from "./recommendation/evidence";
import { normalizeAdmissionMetrics } from "./recommendation/normalize";
import { buildReasons } from "./recommendation/reasons";
import { scoreCandidate } from "./recommendation/scoring";

const riskLabel = { reach: "\u51b2", stable: "\u7a33", safe: "\u4fdd", pending: "\u5f85\u6838\u9a8c" } as const;
const confidenceLabel = { high: "\u9ad8", medium: "\u4e2d", low: "\u4f4e" } as const;

export function scoreOffering(item: MajorOffering, expectedScore?: number | null) {
  const inferredScope = item.lineScope ?? (item.retestLineKind === "\u4e13\u4e1a\u7ebf" ? "professional" : item.retestLineKind === "\u56fd\u5bb6\u7ebf\u515c\u5e95" ? "national" : "school");
  const metrics = normalizeAdmissionMetrics({ ...item, lineScope: inferredScope });
  const sourceAuthority = item.retestLineKind === "\u4e13\u4e1a\u7ebf" ? "college-official" : item.retestLineKind === "\u56fd\u5bb6\u7ebf\u515c\u5e95" ? "school-official" : "institution";
  const verificationStatus = item.retestLineKind === "\u4e13\u4e1a\u7ebf" ? "verified" : item.retestLineKind === "\u7f51\u7edc\u53c2\u8003" ? "auto-review" : "pending";
  const evidence = deriveEvidenceDimensions({
    lineScope: inferredScope,
    sourceAuthority,
    verificationStatus,
    sourceYear: item.retestLineYear ?? 2024,
    completeness: [item.retestLineReference, metrics.generalExamPlan, metrics.firstChoiceRetestRatio, item.enrollment2027].filter((value) => value != null).length / 4,
  });
  const referenceLine = metrics.professionalLine ?? metrics.collegeLine ?? metrics.schoolLine ?? metrics.nationalLine;
  const input = { expectedScore: expectedScore ?? null, referenceLine, metrics, evidence, enrollmentChange: item.enrollmentChange ?? null };
  const recommendation = scoreCandidate(input);
  const detailed = buildReasons(input, item.retestLineSourceUrl ? [item.retestLineSourceUrl] : []);
  return {
    score: recommendation,
    recommendation,
    recommendationReasonsDetailed: detailed,
    recommendationScore: recommendation.finalScore,
    riskLevel: riskLabel[recommendation.riskLevel],
    recommendationReasons: detailed.map((reason) => reason.text),
    recommendationConfidence: confidenceLabel[evidence.confidence],
    evidence,
    normalizedMetrics: metrics,
  };
}

export { selectTrustedTopTen } from "./recommendation/top-ten";
export { buildResultVersion, sha256, ALGORITHM_VERSION } from "./recommendation/version";
