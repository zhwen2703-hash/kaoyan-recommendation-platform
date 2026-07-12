import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("official admission snapshot", () => {
  it("contains the full official unit catalog and never fabricates unpublished metrics", async () => {
    const snapshot = JSON.parse(await readFile("data/admission-units.json", "utf8"));
    expect(snapshot.count).toBeGreaterThanOrEqual(900);
    expect(snapshot.units.some((unit: { name: string }) => unit.name === "北京大学")).toBe(true);
    expect(snapshot.units.every((unit: { enrollment: null; applicants: null }) => unit.enrollment === null && unit.applicants === null)).toBe(true);
    expect(snapshot.units.every((unit: { history: Array<{ year: number }> }) => unit.history.map((item) => item.year).join(",") === "2026,2025,2024,2023")).toBe(true);
  });
});
