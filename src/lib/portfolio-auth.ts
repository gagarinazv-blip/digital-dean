import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { PortfolioActor } from "@/lib/portfolio";

export async function getPortfolioActor(): Promise<PortfolioActor | null> {
  const user = await getCurrentUser();
  if (!user || user.requiresPasswordSetup) return null;

  if (user.role === "STUDENT") {
    const student = await getPrisma().student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) return null;
    return {
      userId: user.id,
      role: "STUDENT",
      studentId: student.id,
      isManager: false,
    };
  }

  const staff = await getPrisma().staffProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!staff) return null;
  return {
    userId: user.id,
    role: "STAFF",
    studentId: null,
    isManager: user.login === "staff.manager",
  };
}
