"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { encryptCorporateMailPassword } from "@/lib/corporate-mail-credentials";
import { normalizeCorporateEmail } from "@/lib/corporate-mail";
import { getPrisma } from "@/lib/prisma";
import { normalizeStudentPhone } from "@/lib/student-login";
import { requireStaffContext } from "@/lib/staff";

export type StudentManagementField =
  | "fullName"
  | "phone"
  | "faculty"
  | "direction"
  | "course"
  | "groupId"
  | "corporateEmail"
  | "corporateMailPassword";

export type StudentManagementActionState = {
  error?: string;
  success?: string;
  requiresPhoneConfirmation?: boolean;
  fieldErrors?: Partial<Record<StudentManagementField, string>>;
};

type StudentInput = {
  fullName: string;
  phone: string;
  course: number;
  groupId: number;
  faculty?: string;
  direction?: string;
};

function getString(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

function parseStudentInput(
  formData: FormData,
  includeAcademicFields: boolean,
): { input: StudentInput } | { fieldErrors: StudentManagementActionState["fieldErrors"] } {
  const fieldErrors: NonNullable<
    StudentManagementActionState["fieldErrors"]
  > = {};
  const rawName = getString(formData, "fullName");
  const rawPhone = getString(formData, "phone");
  const rawCourse = getString(formData, "course");
  const rawGroupId = getString(formData, "groupId");
  const fullName = rawName?.trim() ?? "";
  const phone = rawPhone ? normalizeStudentPhone(rawPhone) : null;
  const course =
    rawCourse && /^\d+$/.test(rawCourse) ? Number(rawCourse) : NaN;
  const groupId =
    rawGroupId && /^\d+$/.test(rawGroupId) ? Number(rawGroupId) : NaN;

  if (!fullName || fullName.length > 160) {
    fieldErrors.fullName = "Введите ФИО (не более 160 символов).";
  }
  if (!phone) {
    fieldErrors.phone = "Введите корректный номер телефона.";
  }
  if (!Number.isSafeInteger(course) || course < 1 || course > 6) {
    fieldErrors.course = "Выберите курс от 1 до 6.";
  }
  if (!Number.isSafeInteger(groupId) || groupId < 1) {
    fieldErrors.groupId = "Выберите учебную группу.";
  }

  let faculty: string | undefined;
  let direction: string | undefined;
  if (includeAcademicFields) {
    const rawFaculty = getString(formData, "faculty");
    const rawDirection = getString(formData, "direction");
    faculty = rawFaculty?.trim();
    direction = rawDirection?.trim();
    if (!faculty || faculty.length > 180) {
      fieldErrors.faculty = "Укажите факультет (не более 180 символов).";
    }
    if (!direction || direction.length > 180) {
      fieldErrors.direction = "Укажите направление (не более 180 символов).";
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !phone || !fullName) {
    return { fieldErrors };
  }

  return {
    input: {
      fullName,
      phone,
      course,
      groupId,
      ...(includeAcademicFields ? { faculty, direction } : {}),
    },
  };
}

function getStudentId(formData: FormData): number | null {
  const rawId = getString(formData, "studentId");
  if (!rawId || !/^[1-9]\d*$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getUniqueConstraintTargets(error: unknown): string[] {
  if (
    !isRecord(error) ||
    error.code !== "P2002" ||
    !isRecord(error.meta)
  ) {
    return [];
  }
  const target = error.meta.target;
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === "string");
  }
  return typeof target === "string" ? [target] : [];
}

function uniqueConstraintError(
  error: unknown,
): StudentManagementActionState | null {
  const target = getUniqueConstraintTargets(error).join(" ").toLowerCase();
  if (target.includes("phone")) {
    return {
      fieldErrors: { phone: "Этот номер телефона уже используется." },
    };
  }
  if (target.includes("corporateemail")) {
    return {
      fieldErrors: {
        corporateEmail: "Этот адрес корпоративной почты уже используется.",
      },
    };
  }
  return null;
}

function logStudentActionFailure(action: string, error: unknown): void {
  console.error(`${action} failed.`, {
    name: error instanceof Error ? error.name : "UnknownError",
    ...(isRecord(error) && typeof error.code === "string"
      ? { code: error.code }
      : {}),
  });
}

function revalidateStudentPaths(studentId: number): void {
  revalidatePath("/staff/students");
  revalidatePath(`/staff/students/${studentId}`);
  revalidatePath("/profile");
}

export async function createStaffStudentAction(
  _previousState: StudentManagementActionState,
  formData: FormData,
): Promise<StudentManagementActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const parsed = parseStudentInput(formData, true);
  if (!("input" in parsed)) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const { input } = parsed;
  if (!input.faculty || !input.direction) {
    return {
      fieldErrors: {
        faculty: "Укажите факультет.",
        direction: "Укажите направление.",
      },
    };
  }
  const faculty = input.faculty;
  const direction = input.direction;
  const prisma = getPrisma();
  let studentId: number;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.studentGroup.findUnique({
        where: { id: input.groupId },
        select: { id: true },
      });
      if (!group) {
        return { error: "Выбранная учебная группа не найдена." };
      }

      const user = await tx.user.create({
        data: {
          login: `student.${randomUUID()}`,
          passwordHash: null,
          role: "STUDENT",
        },
        select: { id: true },
      });
      const student = await tx.student.create({
        data: {
          userId: user.id,
          fullName: input.fullName,
          phone: input.phone,
          faculty,
          direction,
          course: input.course,
          groupId: input.groupId,
          accountStatus: "INVITED",
        },
        select: { id: true },
      });
      await tx.studentAuditLog.create({
        data: {
          studentId: student.id,
          actorUserId: userId,
          action: "STUDENT_CREATED",
          changedFields: [
            "fullName",
            "phone",
            "faculty",
            "direction",
            "course",
            "group",
          ],
        },
      });
      return { id: student.id };
    });

    if ("error" in result) {
      return { error: result.error };
    }
    studentId = result.id;
  } catch (error) {
    const conflict = uniqueConstraintError(error);
    if (conflict) return conflict;
    logStudentActionFailure("Create student", error);
    return { error: "Не удалось добавить студента. Попробуйте позже." };
  }

  revalidatePath("/staff/students");
  redirect(`/staff/students/${studentId}`);
}

export async function updateStaffStudentAction(
  _previousState: StudentManagementActionState,
  formData: FormData,
): Promise<StudentManagementActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const studentId = getStudentId(formData);
  if (studentId === null) {
    return { error: "Некорректный идентификатор студента." };
  }

  const parsed = parseStudentInput(formData, false);
  if (!("input" in parsed)) {
    return { fieldErrors: parsed.fieldErrors };
  }
  const { input } = parsed;

  const rawEmail = getString(formData, "corporateEmail");
  if (rawEmail === null) {
    return {
      fieldErrors: { corporateEmail: "Укажите адрес корпоративной почты." },
    };
  }
  let corporateEmail: string | null;
  try {
    corporateEmail = normalizeCorporateEmail(rawEmail);
  } catch (error) {
    logStudentActionFailure("Validate corporate mail domain", error);
    return { error: "Не удалось проверить домен корпоративной почты." };
  }
  if (rawEmail.trim() && !corporateEmail) {
    return {
      fieldErrors: {
        corporateEmail:
          "Укажите корректный адрес на домене корпоративной почты.",
      },
    };
  }

  const rawMailPassword = getString(formData, "corporateMailPassword");
  if (rawMailPassword === null) {
    return {
      fieldErrors: { corporateMailPassword: "Проверьте поле пароля." },
    };
  }
  if (
    rawMailPassword.length > 256 ||
    (rawMailPassword.length > 0 && !rawMailPassword.trim())
  ) {
    return {
      fieldErrors: {
        corporateMailPassword: "Пароль должен содержать от 1 до 256 символов.",
      },
    };
  }

  const confirmPhoneChange =
    getString(formData, "confirmPhoneChange") === "true";
  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          userId: true,
          fullName: true,
          phone: true,
          course: true,
          groupId: true,
          corporateEmail: true,
          corporateMailPasswordEncrypted: true,
          corporateMailIssuedAt: true,
        },
      });
      if (!current) {
        return { error: "Студент не найден." };
      }

      const group = await tx.studentGroup.findUnique({
        where: { id: input.groupId },
        select: { id: true },
      });
      if (!group) {
        return {
          fieldErrors: { groupId: "Выбранная учебная группа не найдена." },
        };
      }
      if (corporateEmail) {
        const existingEmail = await tx.student.findFirst({
          where: {
            id: { not: studentId },
            corporateEmail: { equals: corporateEmail, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (existingEmail) {
          return {
            fieldErrors: {
              corporateEmail:
                "Этот адрес корпоративной почты уже используется.",
            },
          };
        }
      }

      const phoneChanged = current.phone !== input.phone;
      if (phoneChanged && !confirmPhoneChange) {
        return { requiresPhoneConfirmation: true };
      }

      const emailChanged = current.corporateEmail !== corporateEmail;
      if (
        emailChanged &&
        corporateEmail &&
        current.corporateMailPasswordEncrypted &&
        !rawMailPassword
      ) {
        return {
          fieldErrors: {
            corporateMailPassword:
              "При смене адреса задайте новый пароль почты.",
          },
        };
      }
      if (rawMailPassword && !corporateEmail) {
        return {
          fieldErrors: {
            corporateEmail: "Сначала укажите адрес корпоративной почты.",
          },
        };
      }

      const passwordWasSet = rawMailPassword.length > 0;
      const nextEncryptedPassword = passwordWasSet
        ? encryptCorporateMailPassword(rawMailPassword)
        : corporateEmail
          ? current.corporateMailPasswordEncrypted
          : null;
      const now = new Date();
      const nextIssuedAt = passwordWasSet
        ? now
        : corporateEmail
          ? current.corporateMailIssuedAt
          : null;
      const profileFields: string[] = [];
      if (current.fullName !== input.fullName) profileFields.push("fullName");
      if (current.course !== input.course) profileFields.push("course");
      if (current.groupId !== input.groupId) profileFields.push("group");

      const hasChanges =
        profileFields.length > 0 ||
        phoneChanged ||
        emailChanged ||
        passwordWasSet ||
        current.corporateMailPasswordEncrypted !== nextEncryptedPassword ||
        current.corporateMailIssuedAt !== nextIssuedAt;
      if (!hasChanges) {
        return { success: "Изменений нет." };
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          course: input.course,
          groupId: input.groupId,
          corporateEmail,
          corporateMailPasswordEncrypted: nextEncryptedPassword,
          corporateMailIssuedAt: nextIssuedAt,
        },
      });

      if (phoneChanged) {
        await tx.session.deleteMany({ where: { userId: current.userId } });
        await tx.loginCode.updateMany({
          where: {
            phone: {
              in: [current.phone, input.phone].filter(
                (phone): phone is string => phone !== null,
              ),
            },
            usedAt: null,
          },
          data: { usedAt: now },
        });
      }

      if (profileFields.length > 0) {
        await tx.studentAuditLog.create({
          data: {
            studentId,
            actorUserId: userId,
            action: "PROFILE_UPDATED",
            changedFields: profileFields,
          },
        });
      }
      if (phoneChanged) {
        await tx.studentAuditLog.create({
          data: {
            studentId,
            actorUserId: userId,
            action: "PHONE_CHANGED",
            changedFields: ["phone"],
          },
        });
      }
      if (emailChanged) {
        await tx.studentAuditLog.create({
          data: {
            studentId,
            actorUserId: userId,
            action: "CORPORATE_EMAIL_CHANGED",
            changedFields: ["corporateEmail"],
          },
        });
      }
      if (passwordWasSet) {
        await tx.studentAuditLog.create({
          data: {
            studentId,
            actorUserId: userId,
            action: current.corporateMailPasswordEncrypted
              ? "CORPORATE_MAIL_PASSWORD_REPLACED"
              : "CORPORATE_MAIL_PASSWORD_SET",
            changedFields: ["corporateMailPassword"],
          },
        });
      } else if (
        !corporateEmail &&
        current.corporateMailPasswordEncrypted
      ) {
        await tx.studentAuditLog.create({
          data: {
            studentId,
            actorUserId: userId,
            action: "CORPORATE_MAIL_PASSWORD_CLEARED",
            changedFields: ["corporateMailPassword"],
          },
        });
      }

      return { success: "Изменения сохранены." };
    });

    if ("requiresPhoneConfirmation" in result) {
      return result;
    }
    if ("fieldErrors" in result) {
      return result;
    }
    if ("error" in result) {
      return result;
    }
    if (result.success !== "Изменений нет.") {
      revalidateStudentPaths(studentId);
    }
    return result;
  } catch (error) {
    const conflict = uniqueConstraintError(error);
    if (conflict) return conflict;
    logStudentActionFailure("Update student", error);
    return { error: "Не удалось сохранить данные студента. Попробуйте позже." };
  }
}

export async function resetStudentAccessAction(
  _previousState: StudentManagementActionState,
  formData: FormData,
): Promise<StudentManagementActionState> {
  await assertSameSiteRequest();
  const { userId } = await requireStaffContext();
  const studentId = getStudentId(formData);
  if (studentId === null) {
    return { error: "Некорректный идентификатор студента." };
  }

  try {
    const result = await getPrisma().$transaction(async (tx) => {
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: { id: true, userId: true, phone: true },
      });
      if (!student) {
        return { error: "Студент не найден." };
      }

      await tx.student.update({
        where: { id: studentId },
        data: { accountStatus: "INVITED" },
      });
      await tx.user.update({
        where: { id: student.userId },
        data: { passwordHash: null },
      });
      await tx.session.deleteMany({ where: { userId: student.userId } });
      if (student.phone) {
        await tx.loginCode.updateMany({
          where: { phone: student.phone, usedAt: null },
          data: { usedAt: new Date() },
        });
      }
      await tx.studentAuditLog.create({
        data: {
          studentId,
          actorUserId: userId,
          action: "ACCESS_RESET",
          changedFields: ["accountStatus", "activeSessions"],
        },
      });
      return { success: "Доступ студента сброшен." };
    });

    if ("error" in result) {
      return result;
    }
    revalidateStudentPaths(studentId);
    return result;
  } catch (error) {
    logStudentActionFailure("Reset student access", error);
    return { error: "Не удалось сбросить доступ. Попробуйте позже." };
  }
}
