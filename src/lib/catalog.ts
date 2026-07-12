import { getAdmissionSnapshot } from "./sync";
import type { AdmissionUnit } from "./types";

export async function queryAdmissionUnits(input: { keyword?: string; region?: string; attribute?: string; page?: number; pageSize?: number }) {
  const snapshot = await getAdmissionSnapshot();
  const keyword = input.keyword?.trim().toLowerCase() ?? "";
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const filtered = snapshot.units
    .filter((unit) => !keyword || `${unit.name} ${unit.region} ${unit.department}`.toLowerCase().includes(keyword))
    .filter((unit) => !input.region || input.region === "全部" || unit.region === input.region)
    .filter((unit) => matchesAttribute(unit, input.attribute));
  const start = (page - 1) * pageSize;
  const regions = Array.from(new Set(snapshot.units.map((unit) => unit.region))).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const regionDistribution = regions.map((region) => ({ region, count: snapshot.units.filter((unit) => unit.region === region).length })).sort((a, b) => b.count - a.count);
  return {
    items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)), syncedAt: snapshot.syncedAt,
    source: snapshot.source, sourceUrl: snapshot.sourceUrl, catalogCount: snapshot.count, regions, regionDistribution,
    stats: {
      graduateSchool: snapshot.units.filter((unit) => unit.graduateSchool).length,
      selfMarking: snapshot.units.filter((unit) => unit.selfMarking).length,
      doubleFirstClass: snapshot.units.filter((unit) => unit.doubleFirstClass).length,
      publishedMetrics: snapshot.units.filter((unit) => unit.dataStatus === "official-detail").length,
    },
  };
}

function matchesAttribute(unit: AdmissionUnit, attribute?: string) {
  if (!attribute || attribute === "全部") return true;
  if (attribute === "研究生院") return unit.graduateSchool;
  if (attribute === "自划线") return unit.selfMarking;
  if (attribute === "双一流") return unit.doubleFirstClass;
  return true;
}
