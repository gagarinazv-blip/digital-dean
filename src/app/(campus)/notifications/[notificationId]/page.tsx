import { Suspense } from "react";
import { CampusLoading } from "@/components/campus-section";
import { OpenNotificationContent } from "./open-notification";

type OpenNotificationPageProps = {
  params: Promise<{ notificationId: string }>;
};

export default function OpenNotificationPage({
  params,
}: OpenNotificationPageProps) {
  return (
    <Suspense fallback={<CampusLoading label="уведомление" />}>
      <OpenNotificationContent params={params} />
    </Suspense>
  );
}
