import { redirect } from "next/navigation";

export default function RequestsPage() {
  redirect("/help?tab=requests");
}
