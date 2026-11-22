import type { ReactNode } from "react";
import { DocumentSectionLayout } from "@/components/document-section-layout";

export default function HelpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DocumentSectionLayout>{children}</DocumentSectionLayout>;
}
