import { expect, test } from "vitest";
import type { MajorOffering } from "../src/lib/types";
import { validateSnapshot, type ValidatableSnapshot } from "./validate-snapshot";

const offering = (id: string): MajorOffering => ({ id, schoolCode: id, schoolName: id, region: "x", collegeName: "c", majorCode: "081200", majorName: "m", degreeType: "d", directionName: "r", studyMode: "full", plannedEnrollment: "10", subjects: [{ code: "101", name: "a" }, { code: "201", name: "b" }, { code: "301", name: "c" }, { code: "408", name: "d" }], examType: "408", sourceUrl: "https://example.com" });
const snapshot = (count: number): ValidatableSnapshot => ({ syncedAt: "2026-01-01", count, schoolCount: count, items: Array.from({ length: count }, (_, index) => offering(String(index))) });

test("blocks a strict 408 count drop above fifteen percent", () => {
  expect(validateSnapshot(snapshot(100), snapshot(80))).toMatchObject({ publishable: false });
});

test("blocks duplicate composite professional records", () => {
  const next = snapshot(2); next.items[1] = { ...next.items[0], id: "other" }; next.schoolCount = 1;
  expect(validateSnapshot(null, next)).toMatchObject({ publishable: false });
});
