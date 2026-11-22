import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  PortfolioSource,
  StudentAuditAction,
} from "@/generated/prisma/enums";
import { fileStorage } from "@/lib/file-storage";
import type { PortfolioCategory } from "@/lib/portfolio-constants";
import type { PreparedPortfolioFile } from "@/lib/portfolio-validation";
import {
  MAX_PORTFOLIO_ITEMS,
  MAX_PORTFOLIO_STORAGE_BYTES,
  PORTFOLIO_UPLOADS_PER_HOUR,
  type PortfolioMetadata,
} from "@/lib/portfolio-validation";
import { getPrisma } from "@/lib/prisma";

export type PortfolioActor = {
  userId: number;
  role: "STUDENT" | "STAFF";
  studentId: number | null;
  isManager: boolean;
};

export class PortfolioError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PortfolioError";
  }
}

const globalPortfolioState = globalThis as typeof globalThis & {
  __portfolioUploadHistory?: Map<number, number[]>;
};
const uploadHistory =
  globalPortfolioState.__portfolioUploadHistory ??
  (globalPortfolioState.__portfolioUploadHistory = new Map());

export function consumePortfolioUploadQuota(
  userId: number,
  now = Date.now(),
): void {
  const recent = (uploadHistory.get(userId) ?? []).filter(
    (timestamp: number) => now - timestamp < 60 * 60 * 1000,
  );
  if (recent.length >= PORTFOLIO_UPLOADS_PER_HOUR) {
    uploadHistory.set(userId, recent);
    throw new PortfolioError(
      "Превышен лимит загрузок. Попробуйте позже.",
      429,
    );
  }
  recent.push(now);
  uploadHistory.set(userId, recent);
}

export function canEditPortfolioItem(
  role: PortfolioActor["role"],
  source: PortfolioSource,
): boolean {
  return role === "STUDENT"
    ? source === "STUDENT"
    : source === "STAFF";
}

export function canDeletePortfolioItem(
  role: PortfolioActor["role"],
  isManager: boolean,
  source: PortfolioSource,
): boolean {
  return role === "STUDENT"
    ? source === "STUDENT"
    : source === "STAFF" || (source === "STUDENT" && isManager);
}

function assertStudentActor(actor: PortfolioActor): number {
  if (actor.role !== "STUDENT" || actor.studentId === null) {
    throw new PortfolioError("Действие доступно только студенту.", 403);
  }
  return actor.studentId;
}

function assertPositiveId(id: number): void {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new PortfolioError("Запись не найдена.", 404);
  }
}

function normalizeFolderName(name: string): string {
  return name.normalize("NFKC").toLocaleLowerCase("ru-RU");
}

async function assertFolderOwner(
  transaction: Prisma.TransactionClient,
  studentId: number,
  folderId: number | null,
): Promise<void> {
  if (folderId === null) return;
  const folder = await transaction.portfolioFolder.findFirst({
    where: { id: folderId, studentId, parentId: null },
    select: { id: true },
  });
  if (!folder) {
    throw new PortfolioError("Выбранная папка не найдена.", 404);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function writeStaffAudit(
  transaction: Prisma.TransactionClient,
  actor: PortfolioActor,
  studentId: number,
  action: StudentAuditAction,
  title: string,
): Promise<void> {
  if (actor.role !== "STAFF") return;
  await transaction.studentAuditLog.create({
    data: {
      studentId,
      actorUserId: actor.userId,
      action,
      changedFields: [`portfolio:${title}`],
    },
  });
}

async function checkStudentQuota(
  transaction: Prisma.TransactionClient,
  studentId: number,
  additionalBytes: number,
  replacingBytes = 0,
): Promise<void> {
  const [count, sum] = await Promise.all([
    transaction.portfolioItem.count({ where: { studentId } }),
    transaction.portfolioItem.aggregate({
      where: { studentId },
      _sum: { size: true },
    }),
  ]);
  if (replacingBytes === 0 && count >= MAX_PORTFOLIO_ITEMS) {
    throw new PortfolioError("Достигнут лимит в 200 записей портфолио.", 413);
  }
  const currentBytes = sum._sum.size ?? 0;
  if (
    currentBytes - replacingBytes + additionalBytes >
    MAX_PORTFOLIO_STORAGE_BYTES
  ) {
    throw new PortfolioError(
      "Достигнут общий лимит хранения портфолио 200 МБ.",
      413,
    );
  }
}

export async function createPortfolioFolder(
  studentId: number,
  nameInput: string,
) {
  const name = nameInput.trim();
  if (!name || name.length > 60) {
    throw new PortfolioError("Название папки обязательно (до 60 символов).");
  }

  try {
    return await getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.portfolioFolder.findFirst({
        where: { studentId, normalizedName: normalizeFolderName(name) },
        select: { id: true },
      });
      if (existing) {
        throw new PortfolioError("Папка с таким названием уже существует.");
      }
      return transaction.portfolioFolder.create({
        data: {
          studentId,
          name,
          normalizedName: normalizeFolderName(name),
        },
        select: { id: true, name: true },
      });
    });
  } catch (error) {
    if (error instanceof PortfolioError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new PortfolioError("Папка с таким названием уже существует.");
    }
    throw error;
  }
}

export async function renamePortfolioFolder(
  studentId: number,
  folderId: number,
  nameInput: string,
) {
  assertPositiveId(folderId);
  const name = nameInput.trim();
  if (!name || name.length > 60) {
    throw new PortfolioError("Название папки обязательно (до 60 символов).");
  }
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const folder = await transaction.portfolioFolder.findFirst({
        where: { id: folderId, studentId, parentId: null },
        select: { id: true },
      });
      if (!folder) throw new PortfolioError("Папка не найдена.", 404);
      const duplicate = await transaction.portfolioFolder.findFirst({
        where: {
          studentId,
          id: { not: folderId },
          normalizedName: normalizeFolderName(name),
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new PortfolioError("Папка с таким названием уже существует.");
      }
      return transaction.portfolioFolder.update({
        where: { id: folderId },
        data: { name, normalizedName: normalizeFolderName(name) },
        select: { id: true, name: true },
      });
    });
  } catch (error) {
    if (error instanceof PortfolioError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new PortfolioError("Папка с таким названием уже существует.");
    }
    throw error;
  }
}

export async function deletePortfolioFolder(
  studentId: number,
  folderId: number,
): Promise<void> {
  assertPositiveId(folderId);
  await getPrisma().$transaction(async (transaction) => {
    const folder = await transaction.portfolioFolder.findFirst({
      where: { id: folderId, studentId, parentId: null },
      select: { id: true },
    });
    if (!folder) throw new PortfolioError("Папка не найдена.", 404);
    await transaction.portfolioItem.updateMany({
      where: { studentId, folderId },
      data: { folderId: null },
    });
    await transaction.portfolioFolder.delete({ where: { id: folderId } });
  });
}

export async function movePortfolioItem(
  actor: PortfolioActor,
  itemId: number,
  folderId: number | null,
): Promise<void> {
  const studentId = assertStudentActor(actor);
  assertPositiveId(itemId);
  await getPrisma().$transaction(async (transaction) => {
    await assertFolderOwner(transaction, studentId, folderId);
    const result = await transaction.portfolioItem.updateMany({
      where: { id: itemId, studentId },
      data: { folderId },
    });
    if (result.count !== 1) throw new PortfolioError("Запись не найдена.", 404);
  });
}

export async function createPortfolioItem({
  actor,
  studentId,
  folderId,
  metadata,
  file,
}: {
  actor: PortfolioActor;
  studentId: number;
  folderId: number | null;
  metadata: PortfolioMetadata;
  file: PreparedPortfolioFile;
}) {
  if (actor.role === "STUDENT") {
    studentId = assertStudentActor(actor);
    if (!canEditPortfolioItem(actor.role, "STUDENT")) {
      throw new PortfolioError("Нет доступа к портфолио.", 403);
    }
  }
  assertPositiveId(studentId);

  consumePortfolioUploadQuota(actor.userId);
  const storedName = await fileStorage.save(file.data, file.extension);
  try {
    const item = await getPrisma().$transaction(
      async (transaction) => {
        await checkStudentQuota(transaction, studentId, file.size);
        await assertFolderOwner(transaction, studentId, folderId);
        const source: PortfolioSource =
          actor.role === "STAFF" ? "STAFF" : "STUDENT";
        const item = await transaction.portfolioItem.create({
          data: {
            studentId,
            folderId,
            ...metadata,
            storedName,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            source,
            uploadedById: actor.userId,
          },
          select: { id: true, studentId: true, title: true, source: true },
        });
        if (actor.role === "STAFF") {
          await writeStaffAudit(
            transaction,
            actor,
            studentId,
            "PORTFOLIO_ITEM_CREATED",
            item.title,
          );
        }
        return item;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (actor.role === "STAFF") {
      try {
        await getPrisma().notification.create({
          data: {
            studentId: item.studentId,
            title: "Деканат добавил документ в ваше портфолио",
            text: "В вашем портфолио появилось новое достижение.",
            type: "ANNOUNCEMENT",
          },
        });
      } catch {
        console.error("Portfolio notification creation failed.");
      }
    }
    return item;
  } catch (error) {
    try {
      await fileStorage.delete(storedName);
    } catch {
      console.error("Portfolio file cleanup failed.");
    }
    throw error;
  }
}

export async function updatePortfolioItem({
  actor,
  itemId,
  metadata,
  replacement,
}: {
  actor: PortfolioActor;
  itemId: number;
  metadata: PortfolioMetadata;
  replacement?: PreparedPortfolioFile;
}) {
  assertPositiveId(itemId);
  if (replacement) consumePortfolioUploadQuota(actor.userId);
  const replacementName = replacement
    ? await fileStorage.save(replacement.data, replacement.extension)
    : null;
  let oldStoredName: string | null = null;
  try {
    const updated = await getPrisma().$transaction(
      async (transaction) => {
        const item = await transaction.portfolioItem.findUnique({
          where: { id: itemId },
          select: {
            studentId: true,
            source: true,
            storedName: true,
            size: true,
          },
        });
        if (!item || !canEditPortfolioItem(actor.role, item.source)) {
          throw new PortfolioError("Запись недоступна для изменения.", 404);
        }
        if (
          actor.role === "STUDENT" &&
          actor.studentId !== item.studentId
        ) {
          throw new PortfolioError("Запись недоступна для изменения.", 404);
        }
        if (replacement) {
          await checkStudentQuota(
            transaction,
            item.studentId,
            replacement.size,
            item.size,
          );
        }
        const result = await transaction.portfolioItem.update({
          where: { id: itemId },
          data: {
            ...metadata,
            ...(replacement && replacementName
              ? {
                  storedName: replacementName,
                  originalName: replacement.originalName,
                  mimeType: replacement.mimeType,
                  size: replacement.size,
                }
              : {}),
          },
          select: { id: true, studentId: true, title: true },
        });
        await writeStaffAudit(
          transaction,
          actor,
          item.studentId,
          "PORTFOLIO_ITEM_UPDATED",
          result.title,
        );
        if (replacement) oldStoredName = item.storedName;
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (oldStoredName) {
      try {
        await fileStorage.delete(oldStoredName);
      } catch {
        console.error("Portfolio file cleanup failed.");
      }
    }
    return updated;
  } catch (error) {
    if (replacementName) {
      try {
        await fileStorage.delete(replacementName);
      } catch {
        console.error("Portfolio file cleanup failed.");
      }
    }
    throw error;
  }
}

export async function deletePortfolioItem(
  actor: PortfolioActor,
  itemId: number,
): Promise<void> {
  assertPositiveId(itemId);
  const storedName = await getPrisma().$transaction(async (transaction) => {
    const item = await transaction.portfolioItem.findUnique({
      where: { id: itemId },
      select: { studentId: true, source: true, storedName: true, title: true },
    });
    if (
      !item ||
      !canDeletePortfolioItem(actor.role, actor.isManager, item.source) ||
      (actor.role === "STUDENT" && actor.studentId !== item.studentId)
    ) {
      throw new PortfolioError("Запись недоступна для удаления.", 404);
    }
    await writeStaffAudit(
      transaction,
      actor,
      item.studentId,
      "PORTFOLIO_ITEM_DELETED",
      item.title,
    );
    await transaction.portfolioItem.delete({ where: { id: itemId } });
    return item.storedName;
  });

  try {
    await fileStorage.delete(storedName);
  } catch {
    console.error("Portfolio file cleanup failed.");
  }
}

export async function recordPortfolioFileDownload(
  actor: PortfolioActor,
  item: {
    id: number;
    studentId: number;
    source: PortfolioSource;
    title: string;
  },
): Promise<void> {
  if (actor.role !== "STAFF" || item.source !== "STUDENT") return;
  await getPrisma().studentAuditLog.create({
    data: {
      studentId: item.studentId,
      actorUserId: actor.userId,
      action: "PORTFOLIO_FILE_DOWNLOADED",
      changedFields: [`portfolio:${item.title}`],
    },
  });
}

export async function getStudentPortfolio(studentId: number) {
  const prisma = getPrisma();
  const [folders, items] = await Promise.all([
    prisma.portfolioFolder.findMany({
      where: { studentId, parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.portfolioItem.findMany({
      where: { studentId },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        studentId: true,
        folderId: true,
        title: true,
        category: true,
        eventName: true,
        eventDate: true,
        role: true,
        description: true,
        originalName: true,
        mimeType: true,
        size: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);
  return { folders, items };
}

export async function getPortfolioItemForStaff(itemId: number) {
  assertPositiveId(itemId);
  return getPrisma().portfolioItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      studentId: true,
      folderId: true,
      title: true,
      category: true,
      eventName: true,
      eventDate: true,
      role: true,
      description: true,
      originalName: true,
      mimeType: true,
      size: true,
      source: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          fullName: true,
          course: true,
          group: { select: { name: true } },
        },
      },
      uploadedBy: {
        select: {
          login: true,
          staffProfile: { select: { fullName: true } },
          student: { select: { fullName: true } },
        },
      },
    },
  });
}

export async function getPortfolioFileRecord(itemId: number) {
  assertPositiveId(itemId);
  return getPrisma().portfolioItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      studentId: true,
      storedName: true,
      originalName: true,
      mimeType: true,
      source: true,
      title: true,
    },
  });
}

export async function getStaffPortfolioItems({
  query,
  category,
  source,
  year,
  course,
  groupId,
  page,
  pageSize,
}: {
  query: string;
  category?: PortfolioCategory;
  source?: PortfolioSource;
  year?: number;
  course?: number;
  groupId?: number;
  page: number;
  pageSize: number;
}) {
  const normalized = query.trim().slice(0, 120);
  const where: Prisma.PortfolioItemWhereInput = {
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(year ? { eventDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } : {}),
    ...(course || groupId
      ? {
          student: {
            ...(course ? { course } : {}),
            ...(groupId ? { groupId } : {}),
          },
        }
      : {}),
    ...(normalized
      ? {
          OR: [
            { title: { contains: normalized, mode: "insensitive" } },
            { student: { fullName: { contains: normalized, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    getPrisma().portfolioItem.findMany({
      where,
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        studentId: true,
        folderId: true,
        title: true,
        category: true,
        eventName: true,
        eventDate: true,
        role: true,
        description: true,
        source: true,
        originalName: true,
        createdAt: true,
        student: {
          select: {
            fullName: true,
            course: true,
            group: { select: { id: true, name: true } },
          },
        },
        uploadedBy: {
          select: {
            login: true,
            staffProfile: { select: { fullName: true } },
            student: { select: { fullName: true } },
          },
        },
      },
    }),
    getPrisma().portfolioItem.count({ where }),
  ]);
  return { items, total };
}
