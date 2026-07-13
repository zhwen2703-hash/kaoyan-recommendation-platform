import type { CandidateInput } from "./scoring";
import type { TraceableReason } from "./types";

export function buildReasons(input: CandidateInput, sourceUrls: string[] = []): TraceableReason[] {
  const reasons: TraceableReason[] = [];
  const margin = input.expectedScore != null && input.referenceLine != null ? input.expectedScore - input.referenceLine : null;
  if (margin != null) reasons.push({
    ruleCode: margin >= 0 ? "SCORE_MARGIN_NONNEGATIVE" : "SCORE_MARGIN_NEGATIVE",
    tone: margin >= 20 ? "positive" : margin >= 0 ? "neutral" : "warning",
    text: `\u9884\u671f\u5206\u4e0e\u53c2\u8003\u7ebf\u5dee ${margin >= 0 ? "+" : ""}${margin} \u5206`,
    fields: ["expectedScore", "referenceLine"], sourceUrls,
  });
  if (input.metrics.firstChoiceRetestRatio != null) reasons.push({
    ruleCode: "FIRST_CHOICE_RETEST_RATIO", tone: input.metrics.firstChoiceRetestRatio <= 1.2 ? "positive" : "warning",
    text: `\u4e00\u5fd7\u613f\u666e\u901a\u8ba1\u5212\u590d\u5f55\u6bd4 ${input.metrics.firstChoiceRetestRatio.toFixed(2)}:1`,
    fields: ["firstChoiceRetestCount", "firstChoiceAdmittedCount"], sourceUrls,
  });
  if (input.metrics.generalExamPlan != null) reasons.push({
    ruleCode: "GENERAL_EXAM_PLAN", tone: input.metrics.generalExamPlan >= 20 ? "positive" : "neutral",
    text: `\u7edf\u8003\u666e\u901a\u8ba1\u5212 ${input.metrics.generalExamPlan} \u4eba`, fields: ["generalExamPlan"], sourceUrls,
  });
  if (!input.evidence.canClassifySafe) reasons.push({
    ruleCode: "EVIDENCE_PENDING", tone: "warning", text: "\u7f3a\u5c11\u5df2\u6838\u9a8c\u7684\u4e13\u4e1a/\u5b66\u9662\u7c92\u5ea6\u8bc1\u636e\uff0c\u6682\u4e0d\u5206\u7c7b\u4e3a\u7a33\u59a5\u6216\u4fdd\u5e95", fields: ["granularity", "verification"], sourceUrls,
  });
  return reasons;
}
