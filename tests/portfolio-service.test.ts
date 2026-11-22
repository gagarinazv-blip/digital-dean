import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPrismaMock,
  folderFindFirstMock,
  folderCreateMock,
  folderUpdateMock,
  folderDeleteMock,
  itemCountMock,
  itemAggregateMock,
  itemUpdateManyMock,
  itemFindUniqueMock,
  itemDeleteMock,
  itemCreateMock,
  auditCreateMock,
  fileSaveMock,
  fileDeleteMock,
} = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
  folderFindFirstMock: vi.fn(),
  folderCreateMock: vi.fn(),
  folderUpdateMock: vi.fn(),
  folderDeleteMock: vi.fn(),
  itemCountMock: vi.fn(),
  itemAggregateMock: vi.fn(),
  itemUpdateManyMock: vi.fn(),
  itemFindUniqueMock: vi.fn(),
  itemDeleteMock: vi.fn(),
  itemCreateMock: vi.fn(),
  auditCreateMock: vi.fn(),
  fileSaveMock: vi.fn(),
  fileDeleteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: getPrismaMock,
}));

vi.mock("@/lib/file-storage", () => ({
  fileStorage: {
    save: fileSaveMock,
    delete: fileDeleteMock,
  },
}));

import {
  createPortfolioFolder,
  createPortfolioItem,
  deletePortfolioFolder,
  deletePortfolioItem,
  movePortfolioItem,
} from "../src/lib/portfolio";

const transaction = {
  portfolioFolder: {
    findFirst: folderFindFirstMock,
    create: folderCreateMock,
    update: folderUpdateMock,
    delete: folderDeleteMock,
  },
  portfolioItem: {
    count: itemCountMock,
    aggregate: itemAggregateMock,
    updateMany: itemUpdateManyMock,
    findUnique: itemFindUniqueMock,
    delete: itemDeleteMock,
    create: itemCreateMock,
  },
  studentAuditLog: { create: auditCreateMock },
};

const studentActor = {
  userId: 7,
  role: "STUDENT" as const,
  studentId: 17,
  isManager: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  getPrismaMock.mockReturnValue({
    $transaction: (operation: (tx: typeof transaction) => Promise<unknown>) =>
      operation(transaction),
  });
  folderFindFirstMock.mockResolvedValue(null);
  folderCreateMock.mockResolvedValue({ id: 1, name: "Папка" });
  itemCountMock.mockResolvedValue(0);
  itemAggregateMock.mockResolvedValue({ _sum: { size: 0 } });
  itemUpdateManyMock.mockResolvedValue({ count: 1 });
  itemFindUniqueMock.mockResolvedValue(null);
  itemDeleteMock.mockResolvedValue({});
  fileSaveMock.mockResolvedValue("00000000-0000-4000-8000-000000000001.pdf");
  fileDeleteMock.mockResolvedValue(undefined);
});

describe("portfolio persistence rules", () => {
  it("normalizes folder names and rejects duplicate names case-insensitively", async () => {
    folderFindFirstMock.mockResolvedValueOnce({ id: 2 });

    await expect(createPortfolioFolder(17, "  Научные Работы ")).rejects.toMatchObject({
      message: "Папка с таким названием уже существует.",
    });
    expect(folderFindFirstMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { studentId: 17, normalizedName: "научные работы" },
      }),
    );
    expect(folderCreateMock).not.toHaveBeenCalled();

    folderFindFirstMock.mockResolvedValueOnce(null);
    await createPortfolioFolder(17, "  Научные Работы ");
    expect(folderCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          studentId: 17,
          name: "Научные Работы",
          normalizedName: "научные работы",
        },
      }),
    );
  });

  it("does not move a record into a folder owned by another student", async () => {
    folderFindFirstMock.mockResolvedValueOnce(null);

    await expect(movePortfolioItem(studentActor, 5, 90)).rejects.toMatchObject({
      status: 404,
    });
    expect(itemUpdateManyMock).not.toHaveBeenCalled();
  });

  it("deletes a folder only after moving its records to the root", async () => {
    folderFindFirstMock.mockResolvedValueOnce({ id: 4 });

    await deletePortfolioFolder(17, 4);

    expect(itemUpdateManyMock).toHaveBeenCalledWith({
      where: { studentId: 17, folderId: 4 },
      data: { folderId: null },
    });
    expect(folderDeleteMock).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it("enforces both portfolio item and total file size quotas", async () => {
    const file = {
      data: Buffer.from("%PDF-1.4"),
      extension: "pdf" as const,
      mimeType: "application/pdf" as const,
      originalName: "proof.pdf",
      size: 8,
    };
    const metadata = {
      title: "Тест",
      category: "OTHER" as const,
      eventName: null,
      eventDate: null,
      role: null,
      description: null,
    };

    itemCountMock.mockResolvedValueOnce(200);
    await expect(
      createPortfolioItem({
        actor: studentActor,
        studentId: 999,
        folderId: null,
        metadata,
        file,
      }),
    ).rejects.toMatchObject({ status: 413 });
    expect(fileDeleteMock).toHaveBeenCalledOnce();

    fileDeleteMock.mockClear();
    itemCountMock.mockResolvedValueOnce(199);
    itemAggregateMock.mockResolvedValueOnce({
      _sum: { size: 200 * 1024 * 1024 },
    });
    await expect(
      createPortfolioItem({
        actor: studentActor,
        studentId: 999,
        folderId: null,
        metadata,
        file,
      }),
    ).rejects.toMatchObject({ status: 413 });
    expect(fileDeleteMock).toHaveBeenCalledOnce();
    expect(itemCreateMock).not.toHaveBeenCalled();
  });

  it("deletes the stored file after a permitted record deletion", async () => {
    itemFindUniqueMock.mockResolvedValueOnce({
      studentId: 17,
      source: "STUDENT",
      storedName: "00000000-0000-4000-8000-000000000001.pdf",
      title: "Моя запись",
    });

    await deletePortfolioItem(studentActor, 5);

    expect(itemDeleteMock).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(fileDeleteMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001.pdf",
    );
  });

});
