"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  try {
    await deleteSession();
  } catch {
    console.error("Logout action could not revoke the session.");
  }
  redirect("/login");
}
