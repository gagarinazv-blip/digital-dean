import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertSameSiteRequestMock, requireStudentContextMock, revalidatePathMock, db } =
  vi.hoisted(() => ({
    assertSameSiteRequestMock: vi.fn(),
    requireStudentContextMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    db: {
      deadline: { findFirst: vi.fn() },
      deadlineProgress: { upsert: vi.fn(), update: vi.fn() },
    },
  }));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));
vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    ...db,
    $transaction: (run: (tx: typeof db) => unknown) => run(db),
  })),
}));

import {
  setDeadlineStatusAction,
  toggleDeadlineChecklistItemAction,
} from "../src/app/(campus)/deadlines/[id]/actions";
import {
  getChecklistProgress,
  getDefaultDeadlineChecklist,
  readDeadlineChecklist,
} from "../src/lib/deadline-progress";

const key = { deadlineId: "d1", studentId: 17 };
const checklist = [
  { id: "a", text: "Первый", done: true },
  { id: "b", text: "Второй", done: false },
];

beforeEach(() => {
  vi.resetAllMocks();
  requireStudentContextMock.mockResolvedValue({ student: { id: 17 } });
  // Дедлайн d1 принадлежит только студенту 17.
  db.deadline.findFirst.mockImplementation(async ({ where }) =>
    where.id === "d1" && where.studentId === 17 ? { format: "ONLINE" } : null,
  );
  db.deadlineProgress.upsert.mockResolvedValue({ id: 5, checklist });
});

describe("deadline checklist", () => {
  it("counts progress and falls back to the list for the format", () => {
    expect(getChecklistProgress(checklist)).toEqual({
      done: 1,
      total: 2,
      label: "1 из 2",
    });
    expect(readDeadlineChecklist(undefined, "EXAM")).toEqual(
      getDefaultDeadlineChecklist("EXAM"),
    );
    expect(readDeadlineChecklist([{ id: 1 }], "ONLINE")).toEqual(
      getDefaultDeadlineChecklist("ONLINE"),
    );
    expect(readDeadlineChecklist(checklist, "ONLINE")).toEqual(checklist);
  });

  it("saves a checked item for the current student", async () => {
    await expect(
      toggleDeadlineChecklistItemAction("d1", "b", true),
    ).resolves.toEqual({ ok: true });

    expect(db.deadlineProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deadlineId_studentId: key } }),
    );
    const saved = db.deadlineProgress.update.mock.calls[0][0];
    expect(saved.where).toEqual({ id: 5 });
    expect(getChecklistProgress(saved.data.checklist).label).toBe("2 из 2");
    expect(revalidatePathMock).toHaveBeenCalledWith("/deadlines/d1");
  });

  it("saves the status and rejects unknown values", async () => {
    await expect(setDeadlineStatusAction("d1", "DONE")).resolves.toEqual({
      ok: true,
    });
    expect(db.deadlineProgress.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: "DONE" },
    });
    await expect(setDeadlineStatusAction("d1", "HACKED")).resolves.toEqual({
      ok: false,
    });
    await expect(
      toggleDeadlineChecklistItemAction("d1", "unknown", true),
    ).resolves.toEqual({ ok: false });
    expect(db.deadlineProgress.update).toHaveBeenCalledOnce();
  });

  it("does not write progress for another student's deadline", async () => {
    requireStudentContextMock.mockResolvedValue({ student: { id: 18 } });

    await expect(setDeadlineStatusAction("d1", "DONE")).resolves.toEqual({
      ok: false,
    });
    await expect(
      toggleDeadlineChecklistItemAction("d1", "b", true),
    ).resolves.toEqual({ ok: false });
    expect(db.deadlineProgress.upsert).not.toHaveBeenCalled();
    expect(db.deadlineProgress.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("checks the request origin before reading the session", async () => {
    assertSameSiteRequestMock.mockRejectedValue(new Error("origin"));

    await expect(setDeadlineStatusAction("d1", "DONE")).rejects.toThrow(
      "origin",
    );
    expect(requireStudentContextMock).not.toHaveBeenCalled();
  });
});
