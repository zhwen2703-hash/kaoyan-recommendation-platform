import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import type { MajorOffering } from "../src/lib/types";

const gzipAsync = promisify(gzip);

export type ValidatableSnapshot = { syncedAt: string; count: number; schoolCount: number; items: MajorOffering[] };
export type ValidationReport = {
  publishable: boolean;
  errors: string[];
  warnings: string[];
  counts: { previous: number; next: number; changeRate: number };
  snapshotHash: string;
};

export function validateSnapshot(previous: ValidatableSnapshot | null, next: ValidatableSnapshot): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const previousCount = previous?.count ?? next.count;
  const changeRate = previousCount ? (next.count - previousCount) / previousCount : 0;
  if (previous && changeRate < -0.15) errors.push(`Strict 408 count dropped ${(Math.abs(changeRate) * 100).toFixed(1)}%`);
  if (next.count !== next.items.length) errors.push(`Declared count ${next.count} differs from items ${next.items.length}`);
  const keys = new Set<string>();
  let missingSources = 0;
  let nonpositivePlans = 0;
  for (const item of next.items) {
    const subjectCodes = item.subjects.map((subject) => subject.code);
    if (subjectCodes[3] !== "408" || item.examType !== "408") errors.push(`Non-strict 408 record: ${item.id}`);
    const key = `${item.schoolCode}|${item.majorCode}|${item.collegeName}|${item.studyMode}|${subjectCodes.join("-")}`;
    if (keys.has(key)) errors.push(`Duplicate offering: ${key}`);
    keys.add(key);
    if (!item.sourceUrl) missingSources++;
    for (const value of [item.enrollment2026, item.enrollment2027]) if (value != null && value <= 0) nonpositivePlans++;
    if (item.retestLineReference != null && item.retestLineReference <= 0) errors.push(`Nonpositive retest line on ${item.id}`);
  }
  if (next.items.length && missingSources / next.items.length > 0.01) errors.push("More than 1% of records have no source URL");
  if (next.schoolCount !== new Set(next.items.map((item) => item.schoolCode)).size) errors.push("Declared school count is inconsistent");
  if (changeRate < 0 && changeRate >= -0.15) warnings.push(`Offering count decreased ${(Math.abs(changeRate) * 100).toFixed(1)}%`);
  if (nonpositivePlans) warnings.push(`${nonpositivePlans} published plan values are nonpositive and will be treated as unavailable`);
  const snapshotHash = createHash("sha256").update(JSON.stringify(next)).digest("hex");
  return { publishable: errors.length === 0, errors, warnings, counts: { previous: previousCount, next: next.count, changeRate }, snapshotHash };
}

async function main() {
  const dataPath = path.join(process.cwd(), "data", "408-offerings.json");
  const previousPath = path.join(process.cwd(), "data", ".previous-408.json");
  const snapshotDir = path.join(process.cwd(), "data", "snapshots");
  const next = JSON.parse(await readFile(dataPath, "utf8")) as ValidatableSnapshot;
  await mkdir(snapshotDir, { recursive: true });
  const files = (await readdir(snapshotDir)).filter((name) => name.endsWith("-408.json.gz")).sort();
  let previous: ValidatableSnapshot | null = null;
  try { previous = JSON.parse(await readFile(previousPath, "utf8")) as ValidatableSnapshot; } catch { previous = null; }
  const report = validateSnapshot(previous, next);
  await writeFile(path.join(snapshotDir, "latest-validation.json"), JSON.stringify(report, null, 2), "utf8");
  if (!report.publishable) throw new Error(`Snapshot blocked:\n${report.errors.join("\n")}`);
  const stamp = next.syncedAt.replace(/[:.]/g, "-");
  const archiveName = `${stamp}-408.json.gz`;
  if (!files.includes(archiveName)) await writeFile(path.join(snapshotDir, archiveName), await gzipAsync(JSON.stringify(next)));
  const allArchives = (await readdir(snapshotDir)).filter((name) => name.endsWith("-408.json.gz")).sort();
  for (const file of allArchives.slice(0, -10)) {
    const target = path.resolve(snapshotDir, file);
    if (!target.startsWith(`${path.resolve(snapshotDir)}${path.sep}`)) throw new Error("Unsafe snapshot cleanup path");
    await unlink(target);
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
