import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertSameSiteRequest, requireStaffContext, getPrisma } = vi.hoisted(
  () => ({
    assertSameSiteRequest: vi.fn(),
    requireStaffContext: vi.fn(),
    getPrisma: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ assertSameSiteRequest }));
vi.mock("@/lib/staff", () => ({ requireStaffContext }));
vi.mock("@/lib/prisma", () => ({ getPrisma }));

import {
  createEventAction,
  updateEventAction,
} from "@/app/staff/events/actions";

function eventForm(status: string): FormData {
  const formData = new FormData();
  formData.set("title", "Открытая лекция");
  formData.set("type", "OTHER");
  formData.set("description", "");
  formData.set("date", "2026-11-23");
  formData.set("startsAt", "12:00");
  formData.set("endsAt", "13:00");
  formData.set("location", "Аудитория А-102");
  formData.set("host", "Анна Белова");
  formData.set("registrationUrl", "");
  formData.set("status", status);
  return formData;
}

describe("server-side publication guard", () => {
  beforeEach(() => {
    assertSameSiteRequest.mockReset().mockResolvedValue(undefined);
    requireStaffContext.mockReset().mockResolvedValue({ userId: 7 });
    getPrisma.mockReset();
  });

  it("rejects creating an event directly as published", async () => {
    const result = await createEventAction({}, eventForm("PUBLISHED"));

    expect(result.error).toContain("без завершённых согласований");
    expect(getPrisma).not.toHaveBeenCalled();
  });

  it("rejects publishing a draft with pending approvals", async () => {
    const current = {
      id: 4,
      title: "Открытая лекция",
      type: "OTHER",
      description: null,
      eventDate: new Date("2026-11-23T00:00:00.000Z"),
      startsAt: new Date("2026-11-23T09:00:00.000Z"),
      endsAt: new Date("2026-11-23T10:00:00.000Z"),
      location: "Аудитория А-102",
      host: "Анна Белова",
      registrationUrl: null,
      status: "DRAFT",
      speakerApproval: "PENDING",
      roomApproval: "APPROVED",
      timeApproval: "APPROVED",
      speakerApprovalNote: null,
      roomApprovalNote: null,
      updatedAt: new Date("2026-11-22T12:00:00.000Z"),
    };
    const updateMany = vi.fn();
    getPrisma.mockReturnValue({
      event: { findUnique: vi.fn().mockResolvedValue(current), updateMany },
      $transaction: vi.fn(),
    });
    const formData = eventForm("PUBLISHED");
    formData.set("eventId", "4");

    const result = await updateEventAction({}, formData);

    expect(result.error).toContain("согласования не завершены");
    expect(updateMany).not.toHaveBeenCalled();
  });
});
