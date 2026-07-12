import type { MajorOffering } from "./types";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function scoreOffering(
  item: MajorOffering,
  expectedScore?: number | null,
) {
  const line = item.retestLineReference ?? null;
  const lineIsSpecific =
    item.retestLineKind === "专业线" || item.retestLineKind === "网络参考";
  const margin = expectedScore && line ? expectedScore - line : null;
  const scoreFit =
    line === null
      ? 0.35
      : expectedScore
        ? clamp(((margin ?? 0) + 20) / 80) * (lineIsSpecific ? 1 : 0.72)
        : clamp((390 - line) / 140) * (lineIsSpecific ? 1 : 0.72);
  const ratioEase =
    item.retestAdmissionRatio2026 == null
      ? 0.42
      : clamp((2.2 - item.retestAdmissionRatio2026) / 1.2);
  const enrollmentEase =
    item.enrollment2027 != null
      ? clamp(Math.log1p(item.enrollment2027) / Math.log(101))
      : item.enrollment2026 != null
        ? clamp(Math.log1p(item.enrollment2026) / Math.log(101)) * 0.88
        : 0.3;
  const expansionEase =
    item.enrollmentChange == null
      ? 0.4
      : clamp(0.5 + item.enrollmentChange / 30);
  const completeness =
    [
      lineIsSpecific,
      item.retestAdmissionRatio2026 != null,
      item.enrollment2026 != null,
      item.enrollment2027 != null,
    ].filter(Boolean).length / 4;
  const raw =
    scoreFit * 0.4 +
    ratioEase * 0.25 +
    enrollmentEase * 0.2 +
    expansionEase * 0.15;
  const calculatedScore = Math.round(
    clamp(raw * (0.82 + completeness * 0.18)) * 100,
  );
  const missingCriticalEvidence =
    !lineIsSpecific || item.retestAdmissionRatio2026 == null;
  const recommendationScore = missingCriticalEvidence
    ? Math.min(calculatedScore, 49)
    : calculatedScore;
  const riskLevel = missingCriticalEvidence
    ? "冲"
    : expectedScore && margin !== null
      ? margin >= 25
        ? "保"
        : margin >= 8
          ? "稳"
          : "冲"
      : recommendationScore >= 70
        ? "保"
        : recommendationScore >= 50
          ? "稳"
          : "冲";
  const reasons = [
    margin !== null
      ? `预期分比参考线${margin >= 0 ? "高" : "低"}${Math.abs(margin)}分`
      : `${item.retestLineYear ?? 2026}参考线${line ?? "未知"}`,
    item.retestAdmissionRatio2026 != null
      ? `复录比${item.retestAdmissionRatio2026.toFixed(2)}:1`
      : "复录比缺失",
    item.enrollment2027 != null
      ? `2027拟招${item.enrollment2027}人`
      : item.enrollment2026 != null
        ? `2026拟招${item.enrollment2026}人`
        : "招生人数缺失",
    item.enrollmentChange == null
      ? "扩招信息未公布"
      : item.enrollmentChange > 0
        ? `扩招${item.enrollmentChange}人`
        : item.enrollmentChange < 0
          ? `缩招${Math.abs(item.enrollmentChange)}人`
          : "招生持平",
  ];
  if (missingCriticalEvidence) reasons.push("关键数据不足，按冲刺处理");
  return {
    recommendationScore,
    riskLevel: riskLevel as "冲" | "稳" | "保",
    recommendationReasons: reasons,
    recommendationConfidence: missingCriticalEvidence
      ? ("低" as const)
      : completeness >= 0.75
        ? ("高" as const)
        : completeness >= 0.5
          ? ("中" as const)
          : ("低" as const),
  };
}
