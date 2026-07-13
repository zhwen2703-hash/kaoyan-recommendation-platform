import { expect, test } from "vitest";
import { buildResultVersion } from "./version";

test("snapshot changes produce a different result key", () => {
  expect(buildResultVersion({ snapshotHash: "a", query: { score: 340 } }).resultKey).not.toBe(buildResultVersion({ snapshotHash: "b", query: { score: 340 } }).resultKey);
});
