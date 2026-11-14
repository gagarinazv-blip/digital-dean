import "server-only";

import { forbidden, notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function requireStaffContext() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "STAFF") {
    forbidden();
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

  if (!staff) {
    notFound();
  }

  return { userId: user.id, staff };
}

export async function requireStaff() {
  const { staff } = await requireStaffContext();
  return staff;
}
