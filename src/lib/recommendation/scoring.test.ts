import { expect, test } from "vitest";
import { scoreCandidate, type CandidateInput } from "./scoring";

const candidate = (overrides: Partial<CandidateInput> = {}): CandidateInput => ({
  expectedScore: 350, referenceLine: 320, enrollmentChange: 2,
  evidence: { authority: "college-official", granularity: "professional", completeness: 0.8, freshness: "current", verification: "verified", sourceCount: 1, confidence: "high", canClassifySafe: true },
  metrics: { totalPlan: 30, recommendedExempt: null, generalExamPlan: 25, specialPlan: null, firstChoiceRetestCount: 24, firstChoiceAdmittedCount: 20, firstChoiceRetestRatio: 1.2, professionalLine: 320, collegeLine: null, schoolLine: null, nationalLine: 264, admittedMinimum: null, admittedMedian: null },
  ...overrides,
});

test("national line candidate is pending", () => {
  const base = candidate();
  const result = scoreCandidate({ ...base, evidence: { ...base.evidence, granularity: "national", canClassifySafe: false } });
  expect(result.riskLevel).toBe("pending");
  expect(result.trustedTopTenEligible).toBe(false);
});

test("missing seats and ratio cannot be stable or safe", () => {
  const base = candidate();
  const result = scoreCandidate({ ...base, metrics: { ...base.metrics, generalExamPlan: null, firstChoiceRetestRatio: null } });
  expect(result.riskLevel).toBe("pending");
});

test("friendly competition ranks above risky competition", () => {
  const base = candidate();
  const friendly = scoreCandidate(base);
  const risky = scoreCandidate({ ...base, enrollmentChange: -5, metrics: { ...base.metrics, generalExamPlan: 5, firstChoiceRetestRatio: 1.8 } });
  expect(friendly.finalScore).toBeGreaterThan(risky.finalScore);
});
