import type { RecommendationCandidate } from "./types";

export function selectTrustedTopTen<T extends RecommendationCandidate>(candidates: T[]): T[] {
  const limits = { reach: 3, stable: 4, safe: 3 };
  const schoolCounts = new Map<string, number>();
  const selected: T[] = [];
  for (const item of [...candidates].sort((a, b) => b.score.finalScore - a.score.finalScore)) {
    if (!item.score.trustedTopTenEligible || item.score.riskLevel === "pending") continue;
    const level = item.score.riskLevel;
    if ((schoolCounts.get(item.schoolCode) ?? 0) >= 2 || limits[level] <= 0) continue;
    selected.push(item); schoolCounts.set(item.schoolCode, (schoolCounts.get(item.schoolCode) ?? 0) + 1); limits[level]--;
    if (selected.length === 10) break;
  }
  return selected;
}
