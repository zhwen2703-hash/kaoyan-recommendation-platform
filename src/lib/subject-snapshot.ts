import { spawn } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MajorOffering } from "./types";

export type SubjectSnapshot = {
  source: string; sourceUrl: string; syncedAt: string; subjectCode: string;
  coveredMajors: Array<{ code: string; name: string }>;
  count: number; schoolCount: number; items: MajorOffering[]; refreshing?: boolean;
};

const snapshotPath = path.join(process.cwd(), "data", "408-offerings.json");
const lockPath = path.join(process.cwd(), "data", ".408-sync.lock");
const maxAgeMs = 60 * 60 * 1000;

export async function get408Snapshot() {
  const fileStat = await stat(snapshotPath);
  const refreshing = Date.now() - fileStat.mtimeMs >= maxAgeMs ? await triggerBackgroundRefresh() : await hasActiveLock();
  return { ...JSON.parse(await readFile(snapshotPath, "utf8")) as SubjectSnapshot, refreshing };
}

async function triggerBackgroundRefresh() {
  // Hosted snapshots are refreshed by GitHub Actions; serverless runtimes cannot run the full crawler.
  if (process.env.VERCEL || process.env.CI) return false;
  try {
    await writeFile(lockPath, String(Date.now()), { flag: "wx" });
  } catch {
    return hasActiveLock();
  }
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, ["run", "sync:408", "--", "--force"], {
    cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true,
  });
  child.unref();
  return true;
}

async function hasActiveLock() {
  try {
    const lock = await stat(lockPath);
    return Date.now() - lock.mtimeMs < 30 * 60 * 1000;
  } catch { return false; }
}
