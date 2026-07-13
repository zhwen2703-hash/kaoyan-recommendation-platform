import { expect, test } from "vitest";
import type { MajorOffering } from "../types";
import { normalizeAdmissionMetrics } from "./normalize";

test("uses explicit general exam plan", () => {
  const result = normalizeAdmissionMetrics({ enrollment2026: 30, generalExamPlan2026: 18, recommendedExempt2026: 12 } as MajorOffering);
  expect(result.generalExamPlan).toBe(18);
});

test("computes only explicit first-choice ratio", () => {
  const result = normalizeAdmissionMetrics({ firstChoiceRetestCount2026: 24, firstChoiceAdmittedCount2026: 20 } as MajorOffering);
  expect(result.firstChoiceRetestRatio).toBe(1.2);
});
