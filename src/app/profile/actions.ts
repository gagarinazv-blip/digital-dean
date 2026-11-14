"use server";

import { redirect } from "next/navigation";
import { assertSameSiteRequest, deleteSession, getCurrentUser } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  await assertSameSiteRequest();
  const user = await getCurrentUser();

  try {
    await deleteSession();
  } catch {
    console.error("Logout action could not revoke the session.");
  }

  redirect(user?.role === "STAFF" ? "/staff/login" : "/login");
}
