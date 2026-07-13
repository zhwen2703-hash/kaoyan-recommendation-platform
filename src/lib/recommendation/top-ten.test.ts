import { expect, test } from "vitest";
import { selectTrustedTopTen } from "./top-ten";
import type { RecommendationCandidate } from "./types";

test("top ten contains at most two offerings per school", () => {
  const items = Array.from({ length: 13 }, (_, index) => ({ id: String(index), schoolCode: index < 5 ? "10001" : String(10002 + index), schoolName: "school", score: { matchScore: 80, competitionScore: 80, confidenceScore: 100, riskPenalty: 0, finalScore: 100 - index, riskLevel: "stable", trustedTopTenEligible: true } })) as RecommendationCandidate[];
  const top = selectTrustedTopTen(items);
  expect(top.filter((item) => item.schoolCode === "10001")).toHaveLength(2);
});
