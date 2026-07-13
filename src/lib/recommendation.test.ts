import { describe, expect, test } from "vitest";
import { scoreOffering } from "./recommendation";

const base = {
  retestLineReference: 320,
  retestLineKind: "专业线",
  retestLineYear: 2026,
  retestAdmissionRatio2026: 1.2,
  enrollment2026: 40,
  enrollment2027: 50,
  enrollmentChange: 10,
} as never;

describe("recommendation scoring", () => {
  test("a higher expected score improves recommendation", () => {
    expect(scoreOffering(base, 370).recommendationScore).toBeGreaterThan(
      scoreOffering(base, 315).recommendationScore,
    );
  });
  test("missing critical evidence can never be marked safe", () => {
    const result = scoreOffering(
      {
        ...base,
        retestLineKind: "国家线兜底",
        retestAdmissionRatio2026: null,
      } as never,
      400,
    );
    expect(result.recommendation.trustedTopTenEligible).toBe(false);
    expect(result.recommendation.riskLevel).toBe("pending");
    expect(result.recommendationConfidence).toBe("低");
  });
});
