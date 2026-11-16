"use server";

import { revalidatePath } from "next/cache";
import { assertSameSiteRequest } from "@/lib/auth";
import {
  markAllStudentNotificationsRead,
} from "@/lib/notification-data";
import { requireStudentContext } from "@/lib/student";

export async function markAllNotificationsReadAction(): Promise<void> {
  await assertSameSiteRequest();
  const { student } = await requireStudentContext();
  await markAllStudentNotificationsRead(student.id);
  revalidatePath("/");
  revalidatePath("/notifications");
}
