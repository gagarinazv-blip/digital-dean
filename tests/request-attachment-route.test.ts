import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUserMock,
  findAttachmentMock,
  findStaffProfileMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  findAttachmentMock: vi.fn(),
  findStaffProfileMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    requestAttachment: { findUnique: findAttachmentMock },
    staffProfile: { findUnique: findStaffProfileMock },
  })),
}));

import { GET } from "../src/app/api/request-attachments/[attachmentId]/route";

const studentUser = {
  id: 10,
  login: "student.alpha",
  role: "STUDENT" as const,
  student: {
    id: 20,
    fullName: "Вымышленная студентка",
    faculty: "Факультет",
    direction: "Направление",
    course: 2,
    group: { id: 5, name: "МО-101" },
  },
};

const attachment = {
  kind: "RESULT",
  fileName: "document.pdf",
  mediaType: "application/pdf",
  sizeBytes: 7,
  data: new Uint8Array([37, 80, 68, 70, 45, 49, 55]),
  comment: {
    visibility: "PUBLIC",
    request: {
      studentId: 20,
      assignedToId: 40,
      type: "CERTIFICATE",
      status: "READY",
    },
  },
};

function getAttachment() {
  return GET(new Request("https://digital-dean.test/api/request-attachments/1"), {
    params: Promise.resolve({ attachmentId: "1" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue(studentUser);
  findAttachmentMock.mockResolvedValue(attachment);
  findStaffProfileMock.mockResolvedValue({
    id: 40,
    department: "Учебный отдел",
    isSupervisor: false,
  });
});

describe("request attachment download access", () => {
  it("returns 401 without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const response = await getAttachment();

    expect(response.status).toBe(401);
    expect(findAttachmentMock).not.toHaveBeenCalled();
  });

  it("lets a student download a public file from their own request", async () => {
    const response = await getAttachment();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      attachment.data,
    );
  });

  it("does not allow a result attachment before the request is complete", async () => {
    findAttachmentMock.mockResolvedValue({
      ...attachment,
      comment: {
        ...attachment.comment,
        request: { ...attachment.comment.request, status: "IN_PROGRESS" },
      },
    });

    expect((await getAttachment()).status).toBe(404);
  });

  it("hides private comments and other students' files with 404", async () => {
    findAttachmentMock.mockResolvedValue({
      ...attachment,
      comment: { ...attachment.comment, visibility: "INTERNAL" },
    });
    expect((await getAttachment()).status).toBe(404);

    findAttachmentMock.mockResolvedValue({
      ...attachment,
      comment: {
        ...attachment.comment,
        request: { ...attachment.comment.request, studentId: 21 },
      },
    });
    expect((await getAttachment()).status).toBe(404);
  });

  it("hides files from requests outside a regular employee's scope", async () => {
    getCurrentUserMock.mockResolvedValue({
      ...studentUser,
      id: 11,
      login: "staff.demo",
      role: "STAFF",
      student: null,
    });
    findAttachmentMock.mockResolvedValue({
      ...attachment,
      comment: {
        ...attachment.comment,
        request: {
          ...attachment.comment.request,
          assignedToId: 41,
        },
      },
    });

    const response = await getAttachment();

    expect(response.status).toBe(404);
  });

  it("does not let a supervisor bypass the request permission matrix", async () => {
    getCurrentUserMock.mockResolvedValue({
      ...studentUser,
      id: 12,
      login: "staff.manager",
      role: "STAFF",
      student: null,
    });
    findAttachmentMock.mockResolvedValue({
      ...attachment,
      comment: {
        ...attachment.comment,
        request: {
          ...attachment.comment.request,
          studentId: 21,
          assignedToId: 41,
          type: "APPLICATION",
        },
      },
    });
    findStaffProfileMock.mockResolvedValue({
      id: 42,
      department: "Учебный отдел",
      isSupervisor: true,
    });

    const response = await getAttachment();

    expect(response.status).toBe(404);
  });
});
