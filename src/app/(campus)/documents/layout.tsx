import type { ReactNode } from "react";
import { DocumentSectionLayout } from "@/components/document-section-layout";

export default function DocumentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DocumentSectionLayout>{children}</DocumentSectionLayout>;
}
