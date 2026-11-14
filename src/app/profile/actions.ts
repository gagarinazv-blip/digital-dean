"use server";

import { redirect } from "next/navigation";
import { assertSameSiteRequest, deleteSession } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  await assertSameSiteRequest();

  try {
    await deleteSession();
  } catch {
    console.error("Logout action could not revoke the session.");
  }

  redirect("/login");
}
