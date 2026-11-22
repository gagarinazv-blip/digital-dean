import type { ReactNode } from "react";
import { DocumentSectionLayout } from "@/components/document-section-layout";

export default function RequestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DocumentSectionLayout>{children}</DocumentSectionLayout>;
}
