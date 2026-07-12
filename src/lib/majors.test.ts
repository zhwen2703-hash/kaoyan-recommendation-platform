import { describe, expect, it } from "vitest";
import { classifyExamType } from "./majors";

describe("exam subject classification", () => {
  it("distinguishes 408 from self-designed computer exams", () => {
    expect(classifyExamType([{ code: "408", name: "计算机学科专业基础" }])).toBe("408");
    expect(classifyExamType([{ code: "912", name: "计算机专业基础综合" }])).toBe("自命题");
    expect(classifyExamType([])).toBe("未公开");
  });
});
