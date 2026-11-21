"use server";

import { assertSameSiteRequest } from "@/lib/auth";
import { decryptCorporateMailPassword } from "@/lib/corporate-mail-credentials";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";

export type CorporateMailPasswordResult =
  | { password: string; error?: never }
  | { error: string; password?: never };

function logPasswordAccessFailure(error: unknown): void {
  console.error("Corporate mail password access failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function revealCorporateMailPasswordAction(): Promise<CorporateMailPasswordResult> {
  await assertSameSiteRequest();
  const { student } = await requireStudentContext();

  let credential: {
    corporateEmail: string | null;
    corporateMailPasswordEncrypted: string | null;
    corporateMailIssuedAt: Date | null;
  } | null;
  try {
    credential = await getPrisma().student.findUnique({
      where: { id: student.id },
      select: {
        corporateEmail: true,
        corporateMailPasswordEncrypted: true,
        corporateMailIssuedAt: true,
      },
    });
  } catch (error) {
    logPasswordAccessFailure(error);
    return { error: "Не удалось получить пароль. Попробуйте позже." };
  }

  if (
    !credential?.corporateEmail ||
    !credential.corporateMailPasswordEncrypted ||
    !credential.corporateMailIssuedAt
  ) {
    return { error: "Данные для входа пока не выданы." };
  }

  try {
    return {
      password: decryptCorporateMailPassword(
        credential.corporateMailPasswordEncrypted,
      ),
    };
  } catch (error) {
    logPasswordAccessFailure(error);
    return { error: "Не удалось получить пароль. Обратитесь в деканат." };
  }
}
