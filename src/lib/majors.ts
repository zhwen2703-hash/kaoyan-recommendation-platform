import type { ExamSubject, MajorOffering } from "./types";

const BASE = "https://yz.chsi.com.cn";
const cache = new Map<string, { expires: number; value: MajorQueryResult }>();

type MajorSummary = {
  zydm: string; zymc: string; xwlx: string; xwlxmc: string; mldm: string; mlmc: string;
  yjxkdm: string; yjxkmc: string; sign: string; mxxfs: string; mtydxs: string; mjsggjh: string;
};
type SchoolMajor = MajorSummary & { dwdm: string; dwmc: string; szss: string; mdwlxs: string[] };
type Direction = {
  id: string; dwdm: string; dwmc: string; szss: string; yxsmc: string; zydm: string; zymc: string;
  xwlxmc: string; yjfxmc: string; xxfs: string; nzsrsstr: string; kskmz?: Array<Record<string, { kskmdm: string; kskmmc: string }>>;
};

export type MajorQueryResult = {
  major: { code: string; name: string; degreeType: string };
  alternatives: Array<{ code: string; name: string; degreeType: string }>;
  items: MajorOffering[];
  page: number;
  totalSchools: number;
  totalPages: number;
  sourceUrl: string;
  syncedAt: string;
};

const computerMajorCandidates = [
  { code: "081200", name: "计算机科学与技术" },
  { code: "083500", name: "软件工程" },
  { code: "083900", name: "网络空间安全" },
  { code: "085404", name: "计算机技术" },
  { code: "085405", name: "软件工程" },
  { code: "085410", name: "人工智能" },
  { code: "085412", name: "网络与信息安全" },
];

export async function queryExamSubjectOfferings(input: { subjectCode: string; page?: number; region?: string }) {
  const page = Math.max(1, input.page ?? 1);
  const results = await Promise.allSettled(
    computerMajorCandidates.map((major) => queryMajorOfferings({ majorCode: major.code, majorName: major.name, page, examType: "全部" })),
  );
  const rawItems = results
    .filter((result): result is PromiseFulfilledResult<MajorQueryResult> => result.status === "fulfilled")
    .flatMap((result) => result.value.items)
    .filter((item) => item.subjects.some((subject) => subject.code === input.subjectCode))
    .filter((item) => !input.region || input.region === "全部" || item.region === input.region);
  const items = aggregateOfferings(rawItems)
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName, "zh-CN") || a.majorCode.localeCompare(b.majorCode));
  return {
    subjectCode: input.subjectCode,
    page,
    items,
    schoolCount: new Set(items.map((item) => item.schoolCode)).size,
    majorCount: new Set(items.map((item) => item.majorCode)).size,
    coveredMajors: computerMajorCandidates,
    failedMajorQueries: results.filter((result) => result.status === "rejected").length,
    sourceUrl: `${BASE}/zsml/`,
    syncedAt: new Date().toISOString(),
  };
}

function aggregateOfferings(items: MajorOffering[]) {
  const grouped = new Map<string, MajorOffering>();
  items.forEach((item) => {
    const key = `${item.schoolCode}|${item.majorCode}|${item.collegeName}|${item.studyMode}|${item.subjects.map((subject) => subject.code).join("-")}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...item });
      return;
    }
    const directions = new Set(`${current.directionName}、${item.directionName}`.split("、").filter(Boolean));
    current.directionName = Array.from(directions).join("、");
    if (current.plannedEnrollment === "未公开" && item.plannedEnrollment !== "未公开") current.plannedEnrollment = item.plannedEnrollment;
  });
  return Array.from(grouped.values());
}

export async function queryMajorOfferings(input: { majorCode?: string; majorName: string; page?: number; examType?: string }): Promise<MajorQueryResult> {
  const page = Math.max(1, input.page ?? 1);
  const key = `${input.majorCode ?? ""}|${input.majorName}|${page}|${input.examType ?? "全部"}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const summaries = await searchMajor(input.majorCode, input.majorName);
  const summary = summaries.find((item) => item.zydm === input.majorCode) ?? summaries.find((item) => item.zymc === input.majorName) ?? summaries[0];
  if (!summary) throw new Error("研招网未找到该专业，请输入完整专业名称或专业代码");
  const schoolPage = await fetchSchoolPage(summary, page);
  const directionGroups = await Promise.all(schoolPage.list.map((school) => fetchDirections(summary, school)));
  let items = directionGroups.flat();
  if (input.examType && input.examType !== "全部") items = items.filter((item) => item.examType === input.examType);
  const result: MajorQueryResult = {
    major: { code: summary.zydm, name: summary.zymc, degreeType: summary.xwlxmc },
    alternatives: summaries.slice(0, 20).map((item) => ({ code: item.zydm, name: item.zymc, degreeType: item.xwlxmc })),
    items,
    page,
    totalSchools: schoolPage.totalCount,
    totalPages: schoolPage.totalPage,
    sourceUrl: `${BASE}/zsml/`,
    syncedAt: new Date().toISOString(),
  };
  cache.set(key, { expires: Date.now() + 20 * 60 * 1000, value: result });
  return result;
}

export function classifyExamType(subjects: ExamSubject[]): MajorOffering["examType"] {
  if (subjects.some((subject) => subject.code === "408")) return "408";
  if (subjects.length === 0) return "未公开";
  const fourth = subjects.at(-1);
  if (fourth && /^[89]\d{2}$/.test(fourth.code)) return "自命题";
  return "其他统考";
}

async function searchMajor(code: string | undefined, name: string): Promise<MajorSummary[]> {
  const body = new URLSearchParams({ zydm: code ?? "", zymc: name, xwlx: "", mldm: "", yjxkdm: "", xxfs: "", tydxs: "", jsggjh: "", start: "0", curPage: "1", pageSize: "20" });
  const response = await postJson<{ flag: boolean; msg: { list: MajorSummary[] } }>("/zsml/rs/zys.do", body);
  return response.flag ? response.msg.list : [];
}

async function fetchSchoolPage(summary: MajorSummary, page: number): Promise<{ list: SchoolMajor[]; totalCount: number; totalPage: number }> {
  const body = new URLSearchParams({
    zydm: summary.zydm, zymc: summary.zymc, xwlx: summary.xwlx, mldm: summary.mldm, mlmc: summary.mlmc,
    yjxkdm: summary.yjxkdm, yjxkmc: summary.yjxkmc, xxfs: "", tydxs: "", jsggjh: "", sign: summary.sign,
    ssdm: "", dwmc: "", dwdm: "", start: String((page - 1) * 10), curPage: String(page), pageSize: "10",
  });
  const response = await postJson<{ flag: boolean; msg: { list: SchoolMajor[]; totalCount: number; totalPage: number } }>("/zsml/rs/zydws.do", body);
  if (!response.flag) throw new Error(`研招网专业招生单位查询失败：${JSON.stringify(response.msg)}`);
  return response.msg;
}

async function fetchDirections(summary: MajorSummary, school: SchoolMajor): Promise<MajorOffering[]> {
  const body = new URLSearchParams({ zydm: summary.zydm, zymc: summary.zymc, dwdm: school.dwdm, xxfs: school.mxxfs ?? "", dwlxs: (school.mdwlxs ?? ["all"]).join(","), tydxs: school.mtydxs ?? "", jsggjh: school.mjsggjh ?? "", start: "0", pageSize: "20", totalCount: "0" });
  const response = await postJson<{ flag: boolean; msg: { list: Direction[] } }>("/zsml/rs/yjfxs.do", body);
  if (!response.flag) return [];
  return response.msg.list.map((direction) => {
    const subjectGroup = direction.kskmz?.[0] ?? {};
    const subjects = [subjectGroup.km1Vo, subjectGroup.km2Vo, subjectGroup.km3Vo, subjectGroup.km4Vo]
      .filter(Boolean)
      .map((subject) => ({ code: subject.kskmdm, name: subject.kskmmc }));
    return {
      id: direction.id,
      schoolCode: direction.dwdm,
      schoolName: direction.dwmc,
      region: direction.szss,
      collegeName: direction.yxsmc,
      majorCode: direction.zydm,
      majorName: direction.zymc,
      degreeType: direction.xwlxmc,
      directionName: direction.yjfxmc,
      studyMode: direction.xxfs === "2" ? "非全日制" : "全日制",
      plannedEnrollment: direction.nzsrsstr || "未公开",
      subjects,
      examType: classifyExamType(subjects),
      sourceUrl: `${BASE}/zsml/`,
    };
  });
}

async function postJson<T>(pathname: string, body: URLSearchParams): Promise<T> {
  const response = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8", "x-requested-with": "XMLHttpRequest", "user-agent": "Mozilla/5.0 KaoyanOfficialData/1.0" },
    body,
  });
  if (!response.ok) throw new Error(`研招网专业目录请求失败：${response.status}`);
  return response.json() as Promise<T>;
}
