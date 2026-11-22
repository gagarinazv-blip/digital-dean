import { redirect } from "next/navigation";

export default function ReadyDocumentsRedirect() {
  redirect("/documents?tab=documents");
}
