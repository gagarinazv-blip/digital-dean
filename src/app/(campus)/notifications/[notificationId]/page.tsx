import "server-only";

import { Suspense } from "react";
import { CampusLoading } from "@/components/campus-section";
import { openNotification } from "./open-notification";

type OpenNotificationPageProps = {
  params: Promise<{ notificationId: string }>;
};

export default function OpenNotificationPage(props: OpenNotificationPageProps) {
  return (
    <Suspense fallback={<CampusLoading label="уведомление" />}>
      <OpenNotificationContent {...props} />
    </Suspense>
  );
}

function OpenNotificationContent(
  props: OpenNotificationPageProps,
): Promise<never> {
  return openNotification(props);
}
