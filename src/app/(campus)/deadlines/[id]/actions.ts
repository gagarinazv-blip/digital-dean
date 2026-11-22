"use server";

import { revalidatePath } from "next/cache";
import { assertSameSiteRequest } from "@/lib/auth";
import {
  setStudentDeadlineChecklistItem,
  setStudentDeadlineStatus,
} from "@/lib/deadline-data";
import { isDeadlineProgressStatus } from "@/lib/deadline-progress";
import { getDeadlineHref } from "@/lib/deadline-action";
import { requireStudentContext } from "@/lib/student";

export type DeadlineProgressActionResult = { ok: boolean };

function finish(deadlineId: string, ok: boolean): DeadlineProgressActionResult {
  if (ok) revalidatePath(getDeadlineHref(deadlineId));
  return { ok };
}

export async function setDeadlineStatusAction(
  deadlineId: string,
  status: string,
): Promise<DeadlineProgressActionResult> {
  await assertSameSiteRequest();
  const { student } = await requireStudentContext();
  if (typeof deadlineId !== "string" || !isDeadlineProgressStatus(status)) {
    return { ok: false };
  }
  return finish(
    deadlineId,
    await setStudentDeadlineStatus(deadlineId, student.id, status),
  );
}

export async function toggleDeadlineChecklistItemAction(
  deadlineId: string,
  itemId: string,
  done: boolean,
): Promise<DeadlineProgressActionResult> {
  await assertSameSiteRequest();
  const { student } = await requireStudentContext();
  if (
    typeof deadlineId !== "string" ||
    typeof itemId !== "string" ||
    typeof done !== "boolean"
  ) {
    return { ok: false };
  }
  return finish(
    deadlineId,
    await setStudentDeadlineChecklistItem(
      deadlineId,
      student.id,
      itemId,
      done,
    ),
  );
}
