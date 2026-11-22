import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  actorMock,
  assertSameSiteRequestMock,
  createPortfolioItemMock,
  getFileRecordMock,
  readFileMock,
  downloadAuditMock,
} = vi.hoisted(() => ({
  actorMock: vi.fn(),
  assertSameSiteRequestMock: vi.fn(),
  createPortfolioItemMock: vi.fn(),
  getFileRecordMock: vi.fn(),
  readFileMock: vi.fn(),
  downloadAuditMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));

vi.mock("@/lib/portfolio-auth", () => ({
  getPortfolioActor: actorMock,
}));

vi.mock("@/lib/portfolio", () => ({
  createPortfolioItem: createPortfolioItemMock,
  getPortfolioFileRecord: getFileRecordMock,
  recordPortfolioFileDownload: downloadAuditMock,
  PortfolioError: class PortfolioError extends Error {
    status = 400;
  },
}));

vi.mock("@/lib/file-storage", () => ({
  fileStorage: { read: readFileMock },
}));

import { POST as createItem } from "../src/app/api/portfolio/items/route";
import { GET as downloadPortfolioFile } from "../src/app/files/portfolio/[itemId]/route";

const studentActor = {
  userId: 7,
  role: "STUDENT" as const,
  studentId: 17,
  isManager: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  actorMock.mockResolvedValue(studentActor);
  createPortfolioItemMock.mockResolvedValue({
    id: 21,
    studentId: studentActor.studentId,
    title: "Тестовое достижение",
    source: "STUDENT",
  });
});

describe("portfolio protected routes", () => {
  it("uses the student session identity instead of a submitted student id", async () => {
    const formData = new FormData();
    formData.set("studentId", "999");
    formData.set("source", "STAFF");
    formData.set("uploadedById", "8");
    formData.set("title", "Тестовое достижение");
    formData.set("file", new File(["%PDF-1.4\n"], "proof.pdf", {
      type: "application/pdf",
    }));

    const response = await createItem(
      new Request("http://localhost/api/portfolio/items", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    expect(createPortfolioItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: studentActor,
        studentId: studentActor.studentId,
      }),
    );
    const serviceInput = createPortfolioItemMock.mock.calls[0][0];
    expect(serviceInput).not.toHaveProperty("source");
    expect(serviceInput).not.toHaveProperty("uploadedById");
  });

  it("does not stream a file belonging to a different student", async () => {
    getFileRecordMock.mockResolvedValue({
      id: 33,
      studentId: 18,
      storedName: "00000000-0000-4000-8000-000000000001.pdf",
      originalName: "proof.pdf",
      mimeType: "application/pdf",
      source: "STUDENT",
      title: "Тестовое достижение",
    });

    const response = await downloadPortfolioFile(
      new Request("http://localhost/files/portfolio/33"),
      { params: Promise.resolve({ itemId: "33" }) },
    );

    expect(response.status).toBe(404);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("serves staff downloads privately with safe content headers", async () => {
    actorMock.mockResolvedValue({
      userId: 8,
      role: "STAFF",
      studentId: null,
      isManager: true,
    });
    getFileRecordMock.mockResolvedValue({
      id: 33,
      studentId: 17,
      storedName: "00000000-0000-4000-8000-000000000001.pdf",
      originalName: "proof.pdf",
      mimeType: "application/pdf",
      source: "STUDENT",
      title: "Тестовое достижение",
    });
    readFileMock.mockResolvedValue(Buffer.from("%PDF-1.4\n"));
    downloadAuditMock.mockResolvedValue(undefined);

    const response = await downloadPortfolioFile(
      new Request("http://localhost/files/portfolio/33?download=1"),
      { params: Promise.resolve({ itemId: "33" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(downloadAuditMock).toHaveBeenCalledOnce();
  });
});
