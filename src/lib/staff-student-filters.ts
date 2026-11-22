import type { Prisma } from "@/generated/prisma/client";

export type StudentListSearchParams = {
  q?: string | string[];
  course?: string | string[];
  groupId?: string | string[];
  accountStatus?: string | string[];
};

export type StudentListFilters = {
  searchTerm: string;
  course: number | null;
  groupId: number | null;
  accountStatus: "ACTIVE" | "INVITED" | null;
  where: Prisma.StudentWhereInput | undefined;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function getStudentListFilters(
  params: StudentListSearchParams,
  groupIds: readonly number[],
): StudentListFilters {
  const searchTerm = firstValue(params.q).trim().slice(0, 100);
  const phoneDigits = searchTerm.replace(/\D/g, "");
  const rawCourse = firstValue(params.course);
  const parsedCourse = /^\d+$/.test(rawCourse) ? Number(rawCourse) : NaN;
  const course =
    Number.isSafeInteger(parsedCourse) && parsedCourse >= 1 && parsedCourse <= 6
      ? parsedCourse
      : null;
  const rawGroupId = firstValue(params.groupId);
  const parsedGroupId = /^[1-9]\d*$/.test(rawGroupId)
    ? Number(rawGroupId)
    : NaN;
  const groupId =
    Number.isSafeInteger(parsedGroupId) && groupIds.includes(parsedGroupId)
      ? parsedGroupId
      : null;
  const rawAccountStatus = firstValue(params.accountStatus);
  const accountStatus =
    rawAccountStatus === "ACTIVE" || rawAccountStatus === "INVITED"
      ? rawAccountStatus
      : null;

  const conditions: Prisma.StudentWhereInput[] = [];
  if (searchTerm) {
    conditions.push({
      OR: [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : []),
      ],
    });
  }
  if (course !== null) {
    conditions.push({ course });
  }
  if (groupId !== null) {
    conditions.push({ groupId });
  }
  if (accountStatus !== null) {
    conditions.push({ accountStatus });
  }

  return {
    searchTerm,
    course,
    groupId,
    accountStatus,
    where: conditions.length > 0 ? { AND: conditions } : undefined,
  };
}
