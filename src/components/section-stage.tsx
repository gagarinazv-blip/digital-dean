"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const sections: Record<string, string> = {
  "": "today",
  schedule: "schedule",
  deadlines: "tasks",
  digest: "digest",
  grades: "grades",
  documents: "documents",
  requests: "documents",
  help: "documents",
  opportunities: "opportunities",
  notifications: "notifications",
  profile: "profile",
};

/** По разделу выбирается характер анимации, см. section-motion.css. */
export function SectionStage({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const section = sections[usePathname().split("/")[1] ?? ""];
  return (
    <div className={className} data-section={section}>
      {children}
    </div>
  );
}
