import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, deadlineFindFirstMock, materialFindFirstMock } =
  vi.hoisted(() => ({
    getCurrentUserMock: vi.fn(),
    deadlineFindFirstMock: vi.fn(),
    materialFindFirstMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    deadline: { findFirst: deadlineFindFirstMock },
    deadlineMaterial: { findFirst: materialFindFirstMock },
  })),
}));

import { GET as getMaterial } from "../src/app/api/deadline-materials/[materialId]/route";
import { GET as getCalendar } from "../src/app/api/deadlines/[id]/calendar/route";
import { getStudentDeadline } from "../src/lib/deadline-data";

const deadline = {
  id: "d1",
  subject: "Сети",
  title: "Лабораторная",
  topic: null,
  description: null,
  format: "ONLINE",
  dueAt: new Date("2026-12-01T07:00:00.000Z"),
  status: "OPEN",
  taskUrl: null,
  location: null,
  criteria: [],
  disciplineId: null,
  materials: [],
  progress: [],
};

function signIn(studentId: number) {
  getCurrentUserMock.mockResolvedValue({
    id: 7,
    role: "STUDENT",
    requiresPasswordSetup: false,
    student: { id: studentId },
  });
}

const openCalendar = (id: string) =>
  getCalendar(new Request(`http://localhost/api/deadlines/${id}/calendar`), {
    params: Promise.resolve({ id }),
  });
const openMaterial = (query = "") =>
  getMaterial(new Request(`http://localhost/api/deadline-materials/m1${query}`), {
    params: Promise.resolve({ materialId: "m1" }),
  });

beforeEach(() => {
  vi.resetAllMocks();
  // Дедлайн d1 и материал m1 принадлежат только студенту 17.
  deadlineFindFirstMock.mockImplementation(async ({ where }) =>
    where.id === "d1" && where.studentId === 17 ? deadline : null,
  );
  materialFindFirstMock.mockImplementation(async ({ where }) =>
    where.id === "m1" && where.deadline.studentId === 17
      ? {
          fileName: "Методичка.pdf",
          mediaType: "application/pdf",
          data: new Uint8Array([1, 2, 3]),
        }
      : null,
  );
});

describe("deadline access", () => {
  it("returns the deadline to its owner only", async () => {
    await expect(getStudentDeadline("d1", 17)).resolves.toMatchObject({
      id: "d1",
      progress: { status: "NOT_STARTED" },
    });
    await expect(getStudentDeadline("d1", 18)).resolves.toBeNull();
    await expect(getStudentDeadline("missing", 17)).resolves.toBeNull();
  });

  it("answers identically for a foreign and a missing deadline", async () => {
    signIn(18);
    const foreign = await openCalendar("d1");
    const missing = await openCalendar("missing");

    expect([foreign.status, await foreign.text()]).toEqual([404, ""]);
    expect([missing.status, await missing.text()]).toEqual([404, ""]);
  });

  it("serves the calendar and material file to the owner", async () => {
    signIn(17);
    expect((await openCalendar("d1")).headers.get("Content-Type")).toContain(
      "text/calendar",
    );
    const opened = await openMaterial();
    expect(opened.status).toBe(200);
    expect(opened.headers.get("Content-Disposition")).toMatch(/^inline/);
    const downloaded = await openMaterial("?download=1");
    expect(downloaded.headers.get("Content-Disposition")).toMatch(
      /^attachment/,
    );
  });

  it("hides a material from another student and from staff", async () => {
    signIn(18);
    expect((await openMaterial()).status).toBe(404);
    getCurrentUserMock.mockResolvedValue({
      id: 9,
      role: "STAFF",
      requiresPasswordSetup: false,
      student: null,
    });
    expect((await openMaterial()).status).toBe(404);
  });

  it("requires a completed session", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await openMaterial()).status).toBe(401);
    getCurrentUserMock.mockResolvedValue({
      id: 7,
      role: "STUDENT",
      requiresPasswordSetup: true,
      student: { id: 17 },
    });
    expect((await openCalendar("d1")).status).toBe(401);
    expect(deadlineFindFirstMock).not.toHaveBeenCalled();
  });
});
