import type {
  EvidenceDimensions,
  EvidenceGranularity,
  SourceAuthority,
  VerificationStatus,
} from "./types";

export function deriveEvidenceDimensions(input: {
  lineScope: EvidenceGranularity;
  sourceAuthority: SourceAuthority;
  verificationStatus: VerificationStatus;
  sourceYear: number;
  completeness: number;
  sourceCount?: number;
}): EvidenceDimensions {
  const official = ["college-official", "school-official", "chsi"].includes(input.sourceAuthority);
  const specific = input.lineScope === "professional" || input.lineScope === "college";
  const verified = input.verificationStatus === "verified";
  const completeness = Math.min(1, Math.max(0, input.completeness));
  const confidence = official && specific && verified && completeness >= 0.5
    ? "high"
    : verified && completeness >= 0.4 ? "medium" : "low";

  return {
    authority: input.sourceAuthority,
    granularity: input.lineScope,
    completeness,
    freshness: input.sourceYear === 2026 ? "current" : input.sourceYear === 2025 ? "previous" : "historical",
    verification: input.verificationStatus,
    sourceCount: input.sourceCount ?? 1,
    confidence,
    canClassifySafe: specific && verified && confidence !== "low",
  };
}
