import { describe, expect, it } from "vitest";
import { getAverageGrade } from "../src/lib/grade-average";
import { pluralize } from "../src/lib/plural";

describe("dashboard metrics", () => {
  it("averages numeric grades and skips credits", () => {
    expect(getAverageGrade(["5", "4", "зачтено", undefined, "7"])).toBe(4.5);
    expect(getAverageGrade(["зачтено"])).toBeNull();
  });

  it.each([
    [0, "пар"],
    [1, "пара"],
    [2, "пары"],
    [5, "пар"],
    [11, "пар"],
    [21, "пара"],
    [104, "пары"],
    [112, "пар"],
  ])("pluralizes %i", (count, word) => {
    expect(pluralize(count, "пара", "пары", "пар")).toBe(word);
  });
});
