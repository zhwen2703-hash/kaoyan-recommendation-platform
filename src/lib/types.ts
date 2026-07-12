export type HistoricalMetric = {
  year: 2026 | 2025 | 2024 | 2023;
  retestLine: number | null;
  enrollment: number | null;
  retestAdmissionRatio: number | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  note: string;
};

export type AdmissionUnit = {
  id: string;
  name: string;
  region: string;
  department: string;
  graduateSchool: boolean;
  selfMarking: boolean;
  doubleFirstClass: boolean;
  sourceUrl: string;
  syncedAt: string;
  enrollment: number | null;
  applicants: number | null;
  retestLine: number | null;
  initialLine: number | null;
  history: HistoricalMetric[];
  dataStatus: "official-directory" | "official-detail";
};

export type AdmissionSnapshot = {
  source: string;
  sourceUrl: string;
  syncedAt: string;
  count: number;
  units: AdmissionUnit[];
};

export type ExamSubject = { code: string; name: string };

export type MajorOffering = {
  id: string;
  schoolCode: string;
  schoolName: string;
  region: string;
  collegeName: string;
  majorCode: string;
  majorName: string;
  degreeType: string;
  directionName: string;
  studyMode: string;
  plannedEnrollment: string;
  enrollment2026?: number | null;
  enrollment2027?: number | null;
  enrollmentChange?: number | null;
  retestAdmissionRatio2026?: number | null;
  retestAdmissionRatioSourceUrl?: string | null;
  retestRatioConfidence?: "高" | "中" | "低" | null;
  retestRatioBasis?: "官方名单核算" | "权威机构整理" | "多来源交叉验证" | null;
  retestRatioSourceName?: string | null;
  retestCount2026?: number | null;
  admittedCount2026?: number | null;
  graduateSchool?: boolean;
  selfMarking?: boolean;
  doubleFirstClass?: boolean;
  project985?: boolean;
  project211?: boolean;
  backgroundReputation?: "friendly" | "controversial" | "unknown";
  backgroundReputationLabel?: string | null;
  backgroundReputationConfidence?: "中" | "低" | null;
  backgroundReputationSourceName?: string | null;
  backgroundReputationSourceUrl?: string | null;
  subjects: ExamSubject[];
  examType: "408" | "自命题" | "其他统考" | "未公开";
  sourceUrl: string;
};
