"use server";

import { submitOpportunityApplication, withdrawOpportunityApplication } from "@/lib/opportunities";

export async function submitOpportunityAction(opportunityId: number, formData: FormData) {
  const motivation = formData.get("motivation");
  await submitOpportunityApplication(
    opportunityId,
    typeof motivation === "string" ? motivation : "",
  );
}

export async function withdrawOpportunityAction(formData: FormData) {
  const publicId = formData.get("publicId");
  if (typeof publicId === "string") {
    await withdrawOpportunityApplication(publicId);
  }
}
