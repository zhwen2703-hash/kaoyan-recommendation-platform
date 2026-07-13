import type { MajorOffering } from "../types";
import type { NormalizedAdmissionMetrics } from "./types";

export function normalizeAdmissionMetrics(item: MajorOffering): NormalizedAdmissionMetrics {
  const positive = (value: number | null | undefined) => value != null && value > 0 ? value : null;
  const retest = item.firstChoiceRetestCount2026 ?? null;
  const admitted = item.firstChoiceAdmittedCount2026 ?? null;
  const line = item.retestLineReference ?? null;
  return {
    totalPlan: positive(item.totalPlan2026 ?? item.enrollment2026),
    recommendedExempt: positive(item.recommendedExempt2026),
    generalExamPlan: positive(item.generalExamPlan2026),
    specialPlan: positive(item.specialPlan2026),
    firstChoiceRetestCount: retest,
    firstChoiceAdmittedCount: admitted,
    firstChoiceRetestRatio: retest != null && admitted != null && admitted > 0 ? retest / admitted : null,
    professionalLine: item.lineScope === "professional" ? line : null,
    collegeLine: item.lineScope === "college" ? line : null,
    schoolLine: item.lineScope === "school" ? line : null,
    nationalLine: item.lineScope === "national" && line != null ? line : 264,
    admittedMinimum: item.admittedMinimum2026 ?? null,
    admittedMedian: item.admittedMedian2026 ?? null,
  };
}
