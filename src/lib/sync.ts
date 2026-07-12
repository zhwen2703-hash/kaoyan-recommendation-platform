import * as cheerio from "cheerio";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AdmissionSnapshot, AdmissionUnit } from "./types";

const SOURCE_URL = "https://yz.chsi.com.cn/sch/";
const SNAPSHOT_PATH = path.join(process.cwd(), "data", "admission-units.json");
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export async function getAdmissionSnapshot(options: { force?: boolean } = {}): Promise<AdmissionSnapshot> {
  if (!options.force) {
    try {
      const fileStat = await stat(SNAPSHOT_PATH);
      if (Date.now() - fileStat.mtimeMs < MAX_AGE_MS) {
        return JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as AdmissionSnapshot;
      }
    } catch {
      // Missing snapshot falls through to a live sync.
    }
  }
  return syncAdmissionUnits();
}

export async function syncAdmissionUnits(): Promise<AdmissionSnapshot> {
  const syncedAt = new Date().toISOString();
  const units: AdmissionUnit[] = [];
  const seen = new Set<string>();
  const previousByName = new Map<string, AdmissionUnit>();
  try {
    const previous = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as AdmissionSnapshot;
    previous.units.forEach((unit) => previousByName.set(unit.name, unit));
  } catch {
    // First sync has no previous metrics to preserve.
  }

  for (let start = 0; start <= 920; start += 20) {
    const url = start === 0 ? SOURCE_URL : `${SOURCE_URL}?start=${start}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 KaoyanOfficialData/1.0" },
    });
    if (!response.ok) throw new Error(`研招网页面请求失败：${response.status} ${url}`);
    const $ = cheerio.load(await response.text());

    $("a").each((_, element) => {
      const name = $(element).text().replace(/\s+/g, "").trim();
      const href = $(element).attr("href") ?? "";
      if (!href.includes("/sch/schoolInfo") || name.length < 2 || name.length > 50 || seen.has(name)) return;
      const row = $(element).closest("li, tr, .sch-item, .yxk-table").text().replace(/\s+/g, " ").trim() || $(element).parent().parent().text().replace(/\s+/g, " ").trim();
      const sourceUrl = new URL(href, SOURCE_URL).toString();
      const region = extractRegion(row, name);
      const previous = previousByName.get(name);
      units.push({
        id: sourceUrl.match(/schId-([^.]+)/)?.[1] ?? `unit-${units.length + 1}`,
        name,
        region,
        department: row.match(/主管部门：\s*([^\s]+)/)?.[1] ?? "未标注",
        graduateSchool: row.includes("研究生院"),
        selfMarking: row.includes("自划线"),
        doubleFirstClass: row.includes("双一流"),
        sourceUrl,
        syncedAt,
        enrollment: previous?.enrollment ?? null,
        applicants: previous?.applicants ?? null,
        retestLine: previous?.retestLine ?? null,
        initialLine: previous?.initialLine ?? null,
        history: previous?.history?.length ? previous.history : emptyHistory(),
        dataStatus: previous?.dataStatus ?? "official-directory",
      });
      seen.add(name);
    });
  }

  if (units.length < 900) throw new Error(`研招网同步结果异常：仅获取 ${units.length} 个招生单位`);
  const snapshot: AdmissionSnapshot = {
    source: "中国研究生招生信息网院校库",
    sourceUrl: SOURCE_URL,
    syncedAt,
    count: units.length,
    units,
  };
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const tempPath = `${SNAPSHOT_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  await rename(tempPath, SNAPSHOT_PATH);
  return snapshot;
}

function extractRegion(text: string, name: string) {
  const regions = ["北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆"];
  return regions.find((region) => text.includes(region)) ?? regions.find((region) => name.includes(region.slice(0, 2))) ?? "未标注";
}

function emptyHistory(): AdmissionUnit["history"] {
  return ([2026, 2025, 2024, 2023] as const).map((year) => ({
    year,
    retestLine: null,
    enrollment: null,
    retestAdmissionRatio: null,
    sourceUrl: null,
    publishedAt: null,
    note: "未公开",
  }));
}
