import { expect, test } from "vitest";
import { buildReasons } from "./reasons";
import type { CandidateInput } from "./scoring";

test("reasons include rule and field references", () => {
  const input = { expectedScore: 350, referenceLine: 320, enrollmentChange: null, evidence: { authority: "college-official", granularity: "professional", completeness: 0.8, freshness: "current", verification: "verified", sourceCount: 1, confidence: "high", canClassifySafe: true }, metrics: { totalPlan: 20, recommendedExempt: null, generalExamPlan: 18, specialPlan: null, firstChoiceRetestCount: 24, firstChoiceAdmittedCount: 20, firstChoiceRetestRatio: 1.2, professionalLine: 320, collegeLine: null, schoolLine: null, nationalLine: 264, admittedMinimum: null, admittedMedian: null } } as CandidateInput;
  expect(buildReasons(input)[0]).toMatchObject({ ruleCode: "SCORE_MARGIN_NONNEGATIVE", fields: ["expectedScore", "referenceLine"] });
});
