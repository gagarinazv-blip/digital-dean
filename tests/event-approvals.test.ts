import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertSameSiteRequest, requireStaffContext, getPrisma } = vi.hoisted(() => ({
  assertSameSiteRequest: vi.fn(),
  requireStaffContext: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ assertSameSiteRequest }));
vi.mock("@/lib/staff", () => ({ requireStaffContext }));
vi.mock("@/lib/prisma", () => ({ getPrisma }));

import {
  copyEventToNextWeekAction,
  createEventAction,
  publishReadyEventsAction,
  setEventApprovalAction,
  setEventPublicationAction,
  updateEventAction,
} from "@/app/staff/events/actions";
import {
  getApprovalLabel,
  getDigestState,
  getPublicationBlockers,
  getStatusAfterChange,
} from "@/lib/event-approvals";
import { getDigestWeek, getDigestWeekHref, shiftDigestWeek } from "@/lib/event-digest";
import { parseEventInput } from "@/lib/event-validation";

const approved = {
  id: 4,
  title: "Открытая лекция",
  type: "OTHER",
  description: null,
  eventDate: new Date("2026-11-30T00:00:00.000Z"),
  startsAt: new Date("2026-11-30T09:00:00.000Z"),
  endsAt: new Date("2026-11-30T10:00:00.000Z"),
  location: "Арочный зал",
  host: "Вера Тихомир",
  registrationUrl: null,
  status: "DRAFT",
  speakerApproval: "APPROVED",
  roomApproval: "APPROVED",
  timeApproval: "APPROVED",
  speakerApprovalNote: null,
  roomApprovalNote: null,
  timeApprovalNote: null,
  updatedAt: new Date("2026-11-22T12:00:00.000Z"),
} as const;

function form(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  const values = {
    eventId: "4",
    title: approved.title,
    type: "OTHER",
    description: "",
    date: "2026-11-30",
    startsAt: "12:00",
    endsAt: "13:00",
    location: approved.location,
    host: approved.host,
    registrationUrl: "",
    status: "DRAFT",
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) formData.set(name, value);
  return formData;
}

function mockPrisma(current: Record<string, unknown> | null, drafts: unknown[] = []) {
  const event = {
    findUnique: vi.fn().mockResolvedValue(current),
    findMany: vi.fn().mockResolvedValue(drafts),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    create: vi.fn().mockResolvedValue({ id: 9 }),
  };
  const eventApprovalHistory = { create: vi.fn(), createMany: vi.fn() };
  const client = { event, eventApprovalHistory };
  getPrisma.mockReturnValue({
    ...client,
    $transaction: (run: (transaction: typeof client) => unknown) => run(client),
  });
  return client;
}

beforeEach(() => {
  assertSameSiteRequest.mockReset().mockResolvedValue(undefined);
  requireStaffContext.mockReset().mockResolvedValue({ userId: 7 });
  getPrisma.mockReset();
});

describe("approval wording", () => {
  it("agrees with the gender of the item", () => {
    expect(getApprovalLabel("SPEAKER", "APPROVED")).toBe("Спикер согласован");
    expect(getApprovalLabel("ROOM", "PENDING")).toBe("Аудитория согласовывается");
    expect(getApprovalLabel("ROOM", "NOT_APPROVED")).toBe("Аудитория не согласована");
    expect(getApprovalLabel("TIME", "NOT_APPROVED")).toBe("Время не согласовано");
  });

  it("lists everything that prevents publication", () => {
    expect(getPublicationBlockers(approved)).toEqual([]);
    expect(
      getPublicationBlockers({
        ...approved,
        host: null,
        roomApproval: "PENDING",
        startsAt: null,
        timeApproval: "NOT_APPROVED",
      }),
    ).toEqual(["укажите спикера", "аудитория согласовывается", "укажите время"]);
  });

  it("derives the digest state from its events", () => {
    expect(getDigestState([])).toBe("empty");
    expect(getDigestState([{ status: "DRAFT" }])).toBe("draft");
    expect(getDigestState([{ status: "DRAFT" }, { status: "PUBLISHED" }])).toBe("partial");
    expect(getDigestState([{ status: "PUBLISHED" }])).toBe("published");
  });

  it("drops an outdated approval but respects an explicit choice", () => {
    expect(getStatusAfterChange("APPROVED", "APPROVED", true)).toBe("PENDING");
    expect(getStatusAfterChange("APPROVED", "APPROVED", false)).toBe("APPROVED");
    expect(getStatusAfterChange("PENDING", "APPROVED", true)).toBe("APPROVED");
  });
});

describe("week navigation", () => {
  it("keeps staff inside the staff section", () => {
    const week = getDigestWeek("2026-11-16", new Date("2026-11-19T12:00:00Z"));
    expect(getDigestWeekHref(week, 1, undefined, "/staff/events")).toBe("/staff/events?week=2026-11-23");
    expect(getDigestWeekHref(week, 1)).toBe("/digest?week=2026-11-23");
  });

  it("shifts by whole Moscow weeks", () => {
    const week = getDigestWeek(undefined, new Date("2026-11-22T21:30:00Z"));
    expect(shiftDigestWeek(week, 1).startDate.toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(shiftDigestWeek(week, -1).startDate.toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
});

describe("draft form", () => {
  const draft = { title: "Лекция", type: "OTHER", date: "2026-11-30", status: "DRAFT" };

  it("lets a draft have an unknown time, room and speaker", () => {
    const result = parseEventInput(draft);
    expect(result).toMatchObject({
      ok: true,
      value: { startsAt: null, endsAt: null, location: null, host: null },
    });
  });

  it("requires both times or none, and everything for a published event", () => {
    const half = parseEventInput({ ...draft, startsAt: "12:00" });
    expect(half.ok ? {} : half.fieldErrors).toHaveProperty("endsAt");
    const published = parseEventInput({ ...draft, status: "PUBLISHED" });
    expect(Object.keys(published.ok ? {} : published.fieldErrors).sort()).toEqual([
      "endsAt",
      "host",
      "location",
      "startsAt",
    ]);
  });
});

describe("staff actions", () => {
  it("creates a draft with the chosen statuses", async () => {
    const { event } = mockPrisma(null);
    const result = await createEventAction({}, form({ approvalSPEAKER: "PENDING", approvalROOM: "APPROVED", location: "Арочный зал" }));
    expect(result.success).toContain("Черновик");
    expect(event.create.mock.calls[0][0].data).toMatchObject({
      status: "DRAFT",
      speakerApproval: "PENDING",
      roomApproval: "APPROVED",
      timeApproval: "NOT_APPROVED",
      roomApprovedById: 7,
    });
  });

  it("does not approve an empty field", async () => {
    const { event } = mockPrisma(null);
    const result = await createEventAction({}, form({ location: "", approvalROOM: "APPROVED" }));
    expect(result.error).toContain("Аудитория");
    expect(event.create).not.toHaveBeenCalled();

    mockPrisma({ ...approved, host: null, speakerApproval: "PENDING" });
    expect(await setEventApprovalAction(4, "SPEAKER", "APPROVED")).toMatchObject({ ok: false });
  });

  it("hides a published event when its room changes", async () => {
    const { event, eventApprovalHistory } = mockPrisma({ ...approved, status: "PUBLISHED" });
    const result = await updateEventAction({}, form({ status: "PUBLISHED", location: "Чёрный зал" }));
    expect(result.success).toContain("черновики");
    expect(event.updateMany.mock.calls[0][0].data).toMatchObject({
      status: "DRAFT",
      roomApproval: "PENDING",
      roomApprovedById: null,
    });
    expect(eventApprovalHistory.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it("keeps a published event visible when only the text changes", async () => {
    const { event } = mockPrisma({ ...approved, status: "PUBLISHED" });
    await updateEventAction({}, form({ status: "PUBLISHED", title: "Новая лекция" }));
    expect(event.updateMany.mock.calls[0][0].data).toMatchObject({ status: "PUBLISHED", title: "Новая лекция" });
    expect(event.updateMany.mock.calls[0][0].data).not.toHaveProperty("roomApproval");
  });

  it("publishes only a fully approved event", async () => {
    mockPrisma({ ...approved, timeApproval: "PENDING" });
    const denied = await setEventPublicationAction(4, true);
    expect(denied).toMatchObject({ ok: false, error: expect.stringContaining("время согласовывается") });

    const { event } = mockPrisma(approved);
    expect(await setEventPublicationAction(4, true)).toMatchObject({ ok: true });
    expect(event.updateMany.mock.calls[0][0].data).toEqual({ status: "PUBLISHED" });
  });

  it("publishes the ready drafts of the week and leaves the rest", async () => {
    const { event } = mockPrisma(null, [approved, { ...approved, id: 5, roomApproval: "PENDING" }]);
    expect(await publishReadyEventsAction("2026-11-30")).toMatchObject({ ok: true, message: "Опубликовано событий: 1." });
    expect(event.updateMany).toHaveBeenCalledTimes(1);
    expect(await publishReadyEventsAction("2026-12-01")).toMatchObject({ ok: false });
  });

  it("withdraws a published event when an approval is revoked", async () => {
    const { event } = mockPrisma({ ...approved, status: "PUBLISHED" });
    await setEventApprovalAction(4, "TIME", "NOT_APPROVED");
    expect(event.updateMany.mock.calls[0][0].data).toMatchObject({ status: "DRAFT", timeApproval: "NOT_APPROVED" });
  });

  it("copies an event as a draft that needs new approvals", async () => {
    const { event } = mockPrisma({ ...approved, status: "PUBLISHED" });
    expect(await copyEventToNextWeekAction(4)).toMatchObject({ ok: true, weekKey: "2026-12-07" });
    expect(event.create.mock.calls[0][0].data).toMatchObject({
      status: "DRAFT",
      speakerApproval: "NOT_APPROVED",
      eventDate: new Date("2026-12-07T00:00:00.000Z"),
    });
  });

  it("reports a concurrent change and rejects foreign input", async () => {
    const { event } = mockPrisma(approved);
    event.updateMany.mockResolvedValue({ count: 0 });
    expect(await setEventApprovalAction(4, "ROOM", "PENDING")).toMatchObject({ ok: false });
    expect(await setEventApprovalAction(-1, "ROOM", "PENDING")).toMatchObject({ ok: false });
    expect(await setEventApprovalAction(4, "ROOM", "NOT_REQUIRED")).toMatchObject({ ok: false });
  });

  it("checks the staff session before anything else", async () => {
    mockPrisma(approved);
    requireStaffContext.mockRejectedValue(new Error("forbidden"));
    await expect(setEventPublicationAction(4, true)).rejects.toThrow("forbidden");
    expect(getPrisma).not.toHaveBeenCalled();
  });
});
