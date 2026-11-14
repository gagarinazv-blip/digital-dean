import "server-only";

import { forbidden, notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function requireStudentContext() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "STUDENT") {
    forbidden();
  }

  const student = await getPrisma().student.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      faculty: true,
      direction: true,
      course: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!student) {
    notFound();
  }

  return { userId: user.id, student };
}

export async function requireStudent() {
  const { student } = await requireStudentContext();
  return student;
}
