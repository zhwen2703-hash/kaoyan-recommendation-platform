import { createHash } from "node:crypto";

export const ALGORITHM_VERSION = "recommendation-v2.0.0";

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
  return JSON.stringify(value);
};

export function sha256(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function buildResultVersion(input: { snapshotHash: string; query: Record<string, unknown> }) {
  const queryHash = sha256(input.query).slice(0, 16);
  return { algorithmVersion: ALGORITHM_VERSION, queryHash, resultKey: `${input.snapshotHash}:${ALGORITHM_VERSION}:${queryHash}` };
}
