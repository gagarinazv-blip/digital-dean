import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSearchQuery } from "@/lib/search/query";
import {
  studentDocumentsProvider,
  studentEventsProvider,
  studentPortfolioProvider,
  studentRequestsProvider,
} from "@/lib/search/providers/campus";
import {
  staffPortfolioProvider,
  staffEventsProvider,
  staffRequestsProvider,
  staffStudentsProvider,
} from "@/lib/search/providers/staff";
import type { SearchUser } from "@/lib/search/types";

const mocks = vi.hoisted(() => ({
  requestFindMany: vi.fn(),
  attachmentFindMany: vi.fn(),
  studentFindMany: vi.fn(),
  portfolioFindMany: vi.fn(),
  eventFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    request: { findMany: mocks.requestFindMany },
    requestAttachment: { findMany: mocks.attachmentFindMany },
    student: { findMany: mocks.studentFindMany },
    portfolioItem: { findMany: mocks.portfolioFindMany },
    event: { findMany: mocks.eventFindMany },
  }),
}));

const studentUser: SearchUser = {
  role: "STUDENT",
  userId: 1,
  login: "student.alpha",
  student: {
    id: 7,
    fullName: "Анна Смирнова",
    faculty: "Международных отношений",
    direction: "Международные отношения",
    course: 2,
    group: { id: 3, name: "ПИ-31" },
  },
};

const staffUser: SearchUser = {
  role: "STAFF",
  userId: 10,
  staff: {
    id: 4,
    fullName: "Сотрудник",
    position: "Специалист",
    department: "Деканат",
    isSupervisor: true,
  },
};

function getQuery(value: string) {
  const parsed = parseSearchQuery(value);
  if (!parsed.ok) throw new Error("Test query should be valid.");
  return parsed.query;
}

describe("search provider access boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes student requests and documents to the signed-in student's id", async () => {
    mocks.requestFindMany.mockResolvedValue([
      {
        publicId: "00000000-0000-4000-8000-000000000001",
        type: "CERTIFICATE",
        catalogCode: "STUDY_CERTIFICATE",
        status: "IN_PROGRESS",
        comment: null,
        createdAt: new Date("2026-03-01T10:00:00Z"),
      },
    ]);
    mocks.attachmentFindMany.mockResolvedValue([
      {
        id: 9,
        fileName: "Справка.pdf",
        comment: {
          request: {
            publicId: "00000000-0000-4000-8000-000000000001",
            type: "CERTIFICATE",
            catalogCode: "STUDY_CERTIFICATE",
            updatedAt: new Date("2026-03-01T10:00:00Z"),
          },
        },
      },
    ]);

    const [requests, documents] = await Promise.all([
      studentRequestsProvider.search(getQuery("справка"), studentUser, 5),
      studentDocumentsProvider.search(getQuery("справка"), studentUser, 5),
    ]);

    const requestWhere = mocks.requestFindMany.mock.calls[0][0].where;
    expect(requestWhere.studentId).toBe(7);
    expect(requestWhere.AND).toHaveLength(1);
    const documentWhere = mocks.attachmentFindMany.mock.calls[0][0].where;
    expect(documentWhere.kind).toBe("RESULT");
    expect(documentWhere.comment.is.visibility).toBe("PUBLIC");
    expect(documentWhere.comment.is.request.is).toEqual({
      studentId: 7,
      status: "READY",
    });
    expect(requests.results).toHaveLength(1);
    expect(documents.results).toHaveLength(1);
    expect(documents.results[0].href).toBe(
      "/requests/00000000-0000-4000-8000-000000000001",
    );
  });

  it("finds staff students by phone and returns only approved search fields", async () => {
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 22,
        fullName: "Анна Смирнова",
        phone: "+7 (900) 000-00-02",
        course: 2,
        group: { name: "ПИ-31" },
      },
    ]);

    const page = await staffStudentsProvider.search(
      getQuery("8 900 000-00-02"),
      staffUser,
      5,
    );

    const where = mocks.studentFindMany.mock.calls[0][0].where;
    expect(where.AND).toHaveLength(3);
    expect(where.AND[0].OR).toContainEqual({
      phone: { contains: "7" },
    });
    expect(page.results).toHaveLength(1);
    expect(page.results[0].href).toBe("/staff/students/22");
    expect(Object.keys(page.results[0]).sort()).toEqual(
      ["group", "href", "id", "subtitle", "title"].sort(),
    );
    expect(JSON.stringify(page.results[0])).not.toMatch(
      /password|corporateEmail|encrypted/i,
    );
  });

  it("scopes student portfolio search to the signed-in student's records", async () => {
    mocks.portfolioFindMany.mockResolvedValue([
      {
        id: 21,
        title: "Научная конференция",
        category: "SCIENCE",
        eventName: "Студенческая конференция",
        eventDate: new Date("2026-03-01T10:00:00Z"),
        role: "Докладчик",
      },
    ]);

    const page = await studentPortfolioProvider.search(
      getQuery("научная конференция"),
      studentUser,
      5,
    );

    const where = mocks.portfolioFindMany.mock.calls[0][0].where;
    expect(where.studentId).toBe(7);
    expect(where.AND).toHaveLength(2);
    expect(page.results).toHaveLength(1);
    expect(page.results[0].href).toContain("/help?tab=portfolio&q=");
  });

  it("searches all student portfolio records for staff", async () => {
    mocks.portfolioFindMany.mockResolvedValue([
      {
        id: 22,
        title: "Победа в олимпиаде",
        category: "COMPETITION",
        eventName: "Международная олимпиада",
        role: "Победитель",
        source: "STUDENT",
        student: {
          id: 11,
          fullName: "Анна Смирнова",
          group: { name: "ПИ-31" },
        },
      },
    ]);

    const page = await staffPortfolioProvider.search(
      getQuery("олимпиада"),
      staffUser,
      5,
    );

    const where = mocks.portfolioFindMany.mock.calls[0][0].where;
    expect(where.studentId).toBeUndefined();
    expect(where.AND).toHaveLength(1);
    expect(page.results[0].href).toBe(
      "/staff/achievements?q=%D0%9F%D0%BE%D0%B1%D0%B5%D0%B4%D0%B0%20%D0%B2%20%D0%BE%D0%BB%D0%B8%D0%BC%D0%BF%D0%B8%D0%B0%D0%B4%D0%B5",
    );
    expect(page.results[0].subtitle).toContain("Анна Смирнова");
  });

  it("limits student event search results to published events", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: 31,
        title: "Встреча со спикером",
        type: "SPEAKER_MEETING",
        description: null,
        startsAt: new Date("2026-03-01T10:00:00Z"),
        location: "Аудитория 1",
        host: "Вымышленный спикер",
      },
    ]);

    const page = await studentEventsProvider.search(
      getQuery("спикером"),
      studentUser,
      5,
    );

    expect(mocks.eventFindMany.mock.calls[0][0].where.status).toBe("PUBLISHED");
    expect(page.results).toHaveLength(1);
    expect(page.results[0].href).toMatch(/^\/digest\?week=\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps draft events searchable by staff", async () => {
    mocks.eventFindMany.mockResolvedValue([
      {
        id: 32,
        title: "Черновой мастер-класс",
        type: "MASTER_CLASS",
        description: null,
        startsAt: new Date("2026-03-02T10:00:00Z"),
        location: "Аудитория 2",
        host: "Вымышленный ведущий",
        status: "DRAFT",
      },
    ]);

    const page = await staffEventsProvider.search(
      getQuery("черновой"),
      staffUser,
      5,
    );

    expect(mocks.eventFindMany.mock.calls[0][0].where.status).toBeUndefined();
    expect(page.results).toHaveLength(1);
    expect(page.results[0].subtitle).toContain("Черновик");
  });

  it("searches student names when the query uses е instead of ё", async () => {
    mocks.studentFindMany.mockResolvedValue([
      {
        id: 23,
        fullName: "Ёлкина Мария",
        phone: null,
        course: 1,
        group: { name: "МО-11" },
      },
    ]);

    const page = await staffStudentsProvider.search(
      getQuery("елкина"),
      staffUser,
      5,
    );

    const firstTerm = mocks.studentFindMany.mock.calls[0][0].where.AND[0];
    expect(firstTerm.OR).toContainEqual({
      fullName: { contains: "ёлкина", mode: "insensitive" },
    });
    expect(page.results[0]?.title).toBe("Ёлкина Мария");
  });

  it("uses the supervisor-wide request scope for staff managers", async () => {
    mocks.requestFindMany.mockResolvedValue([]);

    await staffRequestsProvider.search(getQuery("справка"), staffUser, 5);

    const where = mocks.requestFindMany.mock.calls[0][0].where;
    expect(where.AND).toHaveLength(1);
    expect(where.AND[0].OR).toBeDefined();
    expect(JSON.stringify(where)).not.toContain("assignedToId");
  });
});
