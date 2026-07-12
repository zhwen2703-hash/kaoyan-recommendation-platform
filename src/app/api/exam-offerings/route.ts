import { NextResponse } from "next/server";
import { queryExamSubjectOfferings } from "@/lib/majors";
import { get408Snapshot } from "@/lib/subject-snapshot";
import { getAdmissionSnapshot } from "@/lib/sync";
import { findNetworkRatio } from "@/lib/network-ratios";
import { findBackgroundReputation } from "@/lib/background-reputation";
import { getSchoolTier } from "@/lib/school-tiers";
import { findRetestLine, getNationalRetestLine } from "@/lib/retest-lines";
import { scoreOffering } from "@/lib/recommendation";
import type { MajorOffering } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    if ((url.searchParams.get("subjectCode") ?? "408") === "408") {
      try {
        const snapshot = await get408Snapshot();
        const schoolSnapshot = await getAdmissionSnapshot();
        const schoolAttributes = new Map(
          schoolSnapshot.units.map((unit) => [unit.name, unit]),
        );
        const region = url.searchParams.get("region") ?? "全部";
        const english = url.searchParams.get("english") ?? "全部";
        const math = url.searchParams.get("math") ?? "全部";
        const schoolTier = url.searchParams.get("schoolTier") ?? "全部";
        const background = url.searchParams.get("background") ?? "全部";
        const maxRetestLine = Number(
          url.searchParams.get("maxRetestLine") ?? "0",
        );
        const expectedScoreRaw = Number(
          url.searchParams.get("expectedScore") ?? "0",
        );
        const expectedScore =
          expectedScoreRaw >= 200 && expectedScoreRaw <= 500
            ? expectedScoreRaw
            : null;
        const sortMode = url.searchParams.get("sort") ?? "recommended";
        const maxRetestRatio = Number(
          url.searchParams.get("maxRetestRatio") ?? "0",
        );
        const keyword = (url.searchParams.get("keyword") ?? "")
          .trim()
          .toLowerCase();
        const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
        const pageSize = 50;
        const enriched = snapshot.items.map((item) => {
          const unit = schoolAttributes.get(item.schoolName);
          const networkRatio = findNetworkRatio(
            item.schoolName,
            item.majorCode,
            item.collegeName,
          );
          const reputation = findBackgroundReputation(item.schoolName);
          const tier = getSchoolTier(
            item.schoolName,
            unit?.doubleFirstClass ?? false,
          );
          const retestLine =
            findRetestLine(item.schoolName, item.majorCode, item.collegeName) ??
            getNationalRetestLine(item.majorCode, item.region);
          const enrollment2026 = parsePublishedEnrollment(
            item.plannedEnrollment,
          );
          const enrollment2027 = item.enrollment2027 ?? null;
          const enrichedItem: MajorOffering = {
            ...item,
            enrollment2026,
            enrollment2027,
            enrollmentChange:
              enrollment2026 !== null && enrollment2027 !== null
                ? enrollment2027 - enrollment2026
                : null,
            retestAdmissionRatio2026:
              item.retestAdmissionRatio2026 ?? networkRatio?.ratio ?? null,
            retestAdmissionRatioSourceUrl:
              item.retestAdmissionRatioSourceUrl ??
              networkRatio?.sourceUrl ??
              null,
            retestRatioConfidence: networkRatio?.confidence ?? null,
            retestRatioBasis: networkRatio?.basis ?? null,
            retestRatioSourceName: networkRatio?.sourceName ?? null,
            retestCount2026: networkRatio?.retestCount ?? null,
            admittedCount2026: networkRatio?.admittedCount ?? null,
            graduateSchool: unit?.graduateSchool ?? false,
            selfMarking: unit?.selfMarking ?? false,
            doubleFirstClass: tier.doubleFirstClass,
            project985: tier.project985,
            project211: tier.project211,
            backgroundReputation: reputation?.status ?? "unknown",
            backgroundReputationLabel: reputation?.label ?? null,
            backgroundReputationConfidence: reputation?.confidence ?? null,
            backgroundReputationSourceName: reputation?.sourceName ?? null,
            backgroundReputationSourceUrl: reputation?.sourceUrl ?? null,
            retestLineReference: retestLine?.totalScore ?? null,
            retestLineYear: retestLine?.year ?? null,
            retestLineKind: retestLine?.kind ?? null,
            retestLineConfidence: retestLine?.confidence ?? null,
            retestLineSourceName: retestLine?.sourceName ?? null,
            retestLineSourceUrl: retestLine?.sourceUrl ?? null,
          };
          return {
            ...enrichedItem,
            ...scoreOffering(enrichedItem, expectedScore),
          };
        });
        const filtered = enriched
          .filter((item) => region === "全部" || item.region === region)
          .filter(
            (item) =>
              english === "全部" ||
              item.subjects.some((subject) => subject.code === english),
          )
          .filter(
            (item) =>
              math === "全部" ||
              item.subjects.some((subject) => subject.code === math),
          )
          .filter(
            (item) =>
              schoolTier === "全部" ||
              (schoolTier === "985"
                ? item.project985
                : schoolTier === "211"
                  ? item.project211
                  : schoolTier === "双一流"
                    ? item.doubleFirstClass
                    : !item.project985 &&
                      !item.project211 &&
                      !item.doubleFirstClass),
          )
          .filter(
            (item) =>
              background === "全部" || item.backgroundReputation === background,
          )
          .filter(
            (item) =>
              !maxRetestLine ||
              (item.retestLineReference != null &&
                item.retestLineReference <= maxRetestLine),
          )
          .filter(
            (item) =>
              !maxRetestRatio ||
              (item.retestAdmissionRatio2026 != null &&
                item.retestAdmissionRatio2026 <= maxRetestRatio),
          )
          .filter(
            (item) =>
              !keyword ||
              `${item.schoolName} ${item.majorName} ${item.collegeName}`
                .toLowerCase()
                .includes(keyword),
          )
          .sort((a, b) =>
            sortMode === "recommended"
              ? b.recommendationScore - a.recommendationScore ||
                b.enrollment2026! - a.enrollment2026!
              : a.schoolName.localeCompare(b.schoolName, "zh-CN"),
          );
        return NextResponse.json(
          {
            subjectCode: "408",
            page,
            pageSize,
            total: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
            items: filtered.slice((page - 1) * pageSize, page * pageSize),
            schoolCount: new Set(filtered.map((item) => item.schoolCode)).size,
            majorCount: new Set(filtered.map((item) => item.majorCode)).size,
            coveredMajors: snapshot.coveredMajors,
            failedMajorQueries: 0,
            sourceUrl: snapshot.sourceUrl,
            syncedAt: snapshot.syncedAt,
            fullSnapshot: true,
            expectedScore,
            sort: sortMode,
            refreshing: snapshot.refreshing ?? false,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        // Before the first full sync, fall back to the live batch query.
      }
    }
    const result = await queryExamSubjectOfferings({
      subjectCode: url.searchParams.get("subjectCode") ?? "408",
      page: Number(url.searchParams.get("page") ?? "1"),
      region: url.searchParams.get("region") ?? "全部",
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "考试科目查询失败" },
      { status: 502 },
    );
  }
}

function parsePublishedEnrollment(value: string) {
  if (!value || value === "未公开") return null;
  const match = value.match(/(?:专业|拟招生人数|招生人数)[：:]?\s*(\d+)/);
  return match ? Number(match[1]) : null;
}
