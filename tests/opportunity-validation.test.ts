import { describe, expect, it } from "vitest";
import { validateOpportunityForm } from "@/lib/opportunity-validation";

function validForm(): FormData {
  const form = new FormData();
  form.set("title", "Клуб геополитики");
  form.set("type", "CLUB");
  form.set("organizer", "Студенческое объединение");
  form.set("shortDescription", "Короткое описание");
  form.set("description", "Подробное описание");
  form.set("requirements", "Открыто студентам");
  form.set("deadline", "2026-12-01T18:00");
  form.set("format", "OFFLINE");
  form.set("cost", "FREE");
  form.set("status", "PUBLISHED");
  form.set("requiredDocuments", "[]");
  form.set("detail_theme", "Международные рынки");
  form.set("detail_leader", "Иван Орлов");
  form.set("detail_schedule", "Вторник, 18:00");
  form.set("detail_location", "Аудитория 101");
  form.set("detail_seats", "20");
  form.set("detail_admission", "По заявке");
  return form;
}

describe("opportunity form validation", () => {
  it("parses Moscow-local times and accepts a valid type-specific form", () => {
    const form = validForm();
    form.set("startsAt", "2026-12-03T14:00");
    form.set("endsAt", "2026-12-03T16:00");
    const result = validateOpportunityForm(form, ["МО"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startsAt?.toISOString()).toBe("2026-12-03T11:00:00.000Z");
      expect(result.value.details.seats).toBe(20);
      expect(result.value.allowLateRequests).toBe(false);
    }
  });

  it("rejects unsafe URLs and invalid date ranges", () => {
    const form = validForm();
    form.set("officialUrl", "javascript:alert(1)");
    form.set("startsAt", "2026-12-03T16:00");
    form.set("endsAt", "2026-12-03T14:00");
    const result = validateOpportunityForm(form, []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Ссылка должна использовать HTTP или HTTPS.");
      expect(result.errors).toContain("Время окончания должно быть позже времени начала.");
    }
  });
});
