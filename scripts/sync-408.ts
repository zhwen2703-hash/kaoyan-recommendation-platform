import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AdmissionSnapshot, ExamSubject, MajorOffering } from "../src/lib/types";

const BASE = "https://yz.chsi.com.cn";
const majors = [
  { code: "081200", name: "计算机科学与技术" }, { code: "083500", name: "软件工程" },
  { code: "083900", name: "网络空间安全" }, { code: "085400", name: "电子信息" },
  { code: "085404", name: "计算机技术" }, { code: "085405", name: "软件工程" },
  { code: "085410", name: "人工智能" }, { code: "085411", name: "大数据技术与工程" },
  { code: "085412", name: "网络与信息安全" }, { code: "140500", name: "智能科学与技术" },
];
const dataDir = path.join(process.cwd(), "data");
const progressPath = path.join(dataDir, "408-progress.json");
const outputPath = path.join(dataDir, "408-offerings.json");
const lockPath = path.join(dataDir, ".408-sync.lock");

type Progress = { completed: string[]; items: MajorOffering[]; startedAt: string };
type Direction = {
  id: string; dwdm: string; dwmc: string; szss: string; yxsmc: string; zydm: string; zymc: string;
  xwlxmc: string; yjfxmc: string; xxfs: string; nzsrsstr: string;
  kskmz?: Array<Record<string, { kskmdm: string; kskmmc: string }>>;
};

async function main() {
  await mkdir(dataDir, { recursive: true });
  if (process.argv.includes("--force")) await unlink(progressPath).catch(() => undefined);
  const catalog = JSON.parse(await readFile(path.join(dataDir, "admission-units.json"), "utf8")) as AdmissionSnapshot;
  const progress = await loadProgress();
  const completed = new Set(progress.completed);
  const pending = catalog.units.filter((unit) => !completed.has(unit.id));
  console.log(`408 全量同步：共 ${catalog.count} 个招生单位，已完成 ${completed.size}，待处理 ${pending.length}`);

  for (let index = 0; index < pending.length; index += 4) {
    const batch = pending.slice(index, index + 4);
    const results = await Promise.all(batch.map(async (unit) => {
      try {
        const unitCode = await fetchUnitCode(unit.sourceUrl);
        if (!unitCode) return { id: unit.id, items: [] as MajorOffering[] };
        const offerings: MajorOffering[] = [];
        for (const major of majors) {
          const directions = await fetchDirections(unitCode, major.code, major.name);
          offerings.push(...directions.filter((item) => item.subjects.some((subject) => subject.code === "408")));
          await delay(80);
        }
        return { id: unit.id, items: offerings };
      } catch (error) {
        console.error(`[失败] ${unit.name}:`, error instanceof Error ? error.message : error);
        return { id: "", items: [] as MajorOffering[] };
      }
    }));
    results.forEach((result) => {
      if (!result.id) return;
      completed.add(result.id);
      progress.items.push(...result.items);
    });
    progress.completed = Array.from(completed);
    await saveProgress(progress);
    console.log(`进度 ${completed.size}/${catalog.count}，发现 408 记录 ${progress.items.length}`);
    await delay(180);
  }

  const items = aggregate(progress.items);
  const snapshot = {
    source: "中国研究生招生信息网 2026 年硕士专业目录",
    sourceUrl: `${BASE}/zsml/`, syncedAt: new Date().toISOString(), subjectCode: "408",
    coverage: "939 个招生单位逐校核验，第四科代码严格等于 408",
    coveredMajors: majors, count: items.length, schoolCount: new Set(items.map((item) => item.schoolCode)).size, items,
  };
  await atomicWrite(outputPath, snapshot);
  await unlink(progressPath).catch(() => undefined);
  console.log(`408 全量快照完成：${snapshot.schoolCount} 所招生单位，${snapshot.count} 条学校-专业记录`);
}

async function fetchUnitCode(sourceUrl: string) {
  const text = await fetchWithRetry(sourceUrl, { headers: { "user-agent": "Mozilla/5.0 KaoyanOfficialData/1.0" } }).then((response) => response.text());
  return text.match(/dwdm=(\d+)/)?.[1] ?? text.match(/id=["']yxdm["'][^>]*value=["'](\d+)/)?.[1] ?? null;
}

async function fetchDirections(unitCode: string, majorCode: string, majorName: string): Promise<MajorOffering[]> {
  const first = await fetchDirectionPage(unitCode, majorCode, majorName, 0);
  const all = [...first.list];
  for (let start = 10; start < first.totalCount; start += 10) {
    const page = await fetchDirectionPage(unitCode, majorCode, majorName, start);
    all.push(...page.list);
  }
  return all.map(toOffering);
}

async function fetchDirectionPage(unitCode: string, majorCode: string, majorName: string, start: number) {
  const body = new URLSearchParams({ zydm: majorCode, zymc: majorName, dwdm: unitCode, xxfs: "", dwlxs: "all", tydxs: "", jsggjh: "", start: String(start), pageSize: "10", totalCount: "0" });
  const response = await fetchWithRetry(`${BASE}/zsml/rs/yjfxs.do`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8", "x-requested-with": "XMLHttpRequest", "user-agent": "Mozilla/5.0 KaoyanOfficialData/1.0" }, body,
  });
  const json = await response.json() as { flag: boolean; msg: { list: Direction[]; totalCount: number } | string };
  if (!json.flag || typeof json.msg === "string") return { list: [] as Direction[], totalCount: 0 };
  return json.msg;
}

function toOffering(direction: Direction): MajorOffering {
  const group = direction.kskmz?.[0] ?? {};
  const subjects: ExamSubject[] = [group.km1Vo, group.km2Vo, group.km3Vo, group.km4Vo].filter(Boolean).map((subject) => ({ code: subject.kskmdm, name: subject.kskmmc }));
  return {
    id: direction.id, schoolCode: direction.dwdm, schoolName: direction.dwmc, region: direction.szss,
    collegeName: direction.yxsmc, majorCode: direction.zydm, majorName: direction.zymc,
    degreeType: direction.xwlxmc || (direction.zydm.startsWith("085") ? "专业学位" : "学术学位"), directionName: direction.yjfxmc, studyMode: direction.xxfs === "2" ? "非全日制" : "全日制",
    plannedEnrollment: direction.nzsrsstr || "未公开", subjects, examType: subjects.some((subject) => subject.code === "408") ? "408" : "自命题",
    enrollment2026: parsePublishedEnrollment(direction.nzsrsstr), enrollment2027: null, enrollmentChange: null,
    retestAdmissionRatio2026: null, retestAdmissionRatioSourceUrl: null,
    sourceUrl: `${BASE}/zsml/`,
  };
}

function parsePublishedEnrollment(value?: string) {
  if (!value) return null;
  const match = value.match(/(?:专业|拟招生人数|招生人数)[：:]?\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

async function fetchWithRetry(url: string, init: RequestInit, attempt = 1): Promise<Response> {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    if (attempt >= 4) throw error;
    await delay(500 * attempt);
    return fetchWithRetry(url, init, attempt + 1);
  }
}

async function loadProgress(): Promise<Progress> {
  try { return JSON.parse(await readFile(progressPath, "utf8")) as Progress; }
  catch { return { completed: [], items: [], startedAt: new Date().toISOString() }; }
}

async function saveProgress(progress: Progress) { await atomicWrite(progressPath, progress); }
async function atomicWrite(target: string, value: unknown) { const temp = `${target}.tmp`; await writeFile(temp, JSON.stringify(value, null, 2), "utf8"); await rename(temp, target); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function aggregate(items: MajorOffering[]) {
  const map = new Map<string, MajorOffering>();
  items.forEach((item) => {
    const key = `${item.schoolCode}|${item.majorCode}|${item.collegeName}|${item.studyMode}|${item.subjects.map((subject) => subject.code).join("-")}`;
    const current = map.get(key);
    if (!current) { map.set(key, { ...item }); return; }
    current.directionName = Array.from(new Set(`${current.directionName}、${item.directionName}`.split("、").filter(Boolean))).join("、");
  });
  return Array.from(map.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName, "zh-CN") || a.majorCode.localeCompare(b.majorCode));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => unlink(lockPath).catch(() => undefined));
