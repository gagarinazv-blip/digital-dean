import "server-only";

import { forbidden, redirect } from "next/navigation";
import type { CurrentUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { SearchUser } from "@/lib/search/types";

export async function resolveSearchUser(
  user: CurrentUser,
): Promise<SearchUser | null> {
  if (user.requiresPasswordSetup) return null;

  if (user.role === "STUDENT") {
    if (!user.student) return null;
    return {
      role: "STUDENT",
      userId: user.id,
      login: user.login,
      student: user.student,
    };
  }

  const staff = await getPrisma().staffProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      position: true,
      department: true,
      isSupervisor: true,
    },
  });
  return staff ? { role: "STAFF", userId: user.id, staff } : null;
}

export async function requireSearchUser(): Promise<SearchUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.requiresPasswordSetup) {
    redirect(`/login?role=${user.role.toLowerCase()}&step=password`);
  }
  const searchUser = await resolveSearchUser(user);
  if (!searchUser) {
    forbidden();
  }
  return searchUser;
}
