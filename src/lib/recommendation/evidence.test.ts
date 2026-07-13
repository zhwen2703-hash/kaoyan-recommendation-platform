import { describe, expect, test } from "vitest";
import { deriveEvidenceDimensions } from "./evidence";

describe("deriveEvidenceDimensions", () => {
  test("official professional evidence can classify safe", () => {
    expect(deriveEvidenceDimensions({
      lineScope: "professional", sourceAuthority: "college-official",
      verificationStatus: "verified", sourceYear: 2026, completeness: 0.75,
    })).toMatchObject({ granularity: "professional", confidence: "high", canClassifySafe: true });
  });

  test("national line always requires verification", () => {
    expect(deriveEvidenceDimensions({
      lineScope: "national", sourceAuthority: "school-official",
      verificationStatus: "verified", sourceYear: 2026, completeness: 0.75,
    })).toMatchObject({ granularity: "national", canClassifySafe: false });
  });
});
