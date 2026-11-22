import { Suspense, type ReactNode } from "react";
import {
  DocumentSectionNavigation,
  DocumentSectionNavigationFallback,
} from "@/components/document-section-navigation";
import styles from "./document-section-layout.module.css";

export function DocumentSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <Suspense fallback={<DocumentSectionNavigationFallback />}>
        <DocumentSectionNavigation />
      </Suspense>
      {children}
    </div>
  );
}
