import { describe, expect, it } from "vitest";
import {
  cleanStudentFacingText,
  getStudentFacingGroupName,
} from "@/lib/campus-labels";

describe("student-facing labels", () => {
  it("removes the legacy seed marker from visible text", () => {
    expect(cleanStudentFacingText("[TEST SEED] История")).toBe("История");
    expect(cleanStudentFacingText("Изменение [TEST SEED] аудитории")).toBe(
      "Изменение аудитории",
    );
    expect(cleanStudentFacingText("Первая строка\n[TEST SEED] вторая")).toBe(
      "Первая строка\nвторая",
    );
  });

  it("shows a readable group name without changing its stored identifier", () => {
    expect(getStudentFacingGroupName("TEST-ACADEMIC-31A")).toBe("ИС-21");
    expect(getStudentFacingGroupName("TEST-ACADEMIC-31B")).toBe("ИС-22");
  });
});
