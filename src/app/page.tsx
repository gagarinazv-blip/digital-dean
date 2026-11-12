import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

async function HomeRedirect(): Promise<null> {
  const user = await getCurrentUser();
  redirect(user ? "/profile" : "/login");
}

export default function Home() {
  return (
    <Suspense fallback={<main aria-busy="true" />}>
      <HomeRedirect />
    </Suspense>
  );
}
