export type SourceAuthority =
  | "college-official"
  | "school-official"
  | "chsi"
  | "institution"
  | "web";

export type EvidenceGranularity = "professional" | "college" | "school" | "national";
export type VerificationStatus = "verified" | "auto-review" | "conflict" | "pending";
export type Confidence = "high" | "medium" | "low";
export type RiskLevel = "reach" | "stable" | "safe" | "pending";

export type EvidenceDimensions = {
  authority: SourceAuthority;
  granularity: EvidenceGranularity;
  completeness: number;
  freshness: "current" | "previous" | "historical";
  verification: VerificationStatus;
  sourceCount: number;
  confidence: Confidence;
  canClassifySafe: boolean;
};

export type NormalizedAdmissionMetrics = {
  totalPlan: number | null;
  recommendedExempt: number | null;
  generalExamPlan: number | null;
  specialPlan: number | null;
  firstChoiceRetestCount: number | null;
  firstChoiceAdmittedCount: number | null;
  firstChoiceRetestRatio: number | null;
  professionalLine: number | null;
  collegeLine: number | null;
  schoolLine: number | null;
  nationalLine: number;
  admittedMinimum: number | null;
  admittedMedian: number | null;
};

export type TraceableReason = {
  ruleCode: string;
  tone: "positive" | "warning" | "neutral";
  text: string;
  fields: string[];
  sourceUrls: string[];
};

export type RecommendationScore = {
  matchScore: number;
  competitionScore: number;
  confidenceScore: number;
  riskPenalty: number;
  finalScore: number;
  riskLevel: RiskLevel;
  trustedTopTenEligible: boolean;
};

export type RecommendationCandidate = {
  id: string;
  schoolCode: string;
  schoolName: string;
  score: RecommendationScore;
};
