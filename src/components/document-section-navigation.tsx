"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  documentSectionItems,
  getActiveDocumentSection,
  type DocumentSectionKey,
} from "@/lib/document-section-navigation";
import styles from "./document-section-navigation.module.css";

export function DocumentSectionNavigationLinks({
  active,
}: {
  active?: DocumentSectionKey;
}) {
  return (
    <nav aria-label="Подразделы документов и заявок" className={styles.navigation}>
      {documentSectionItems.map((item) => {
        const isCurrent = item.key === active;
        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={`${styles.link} ${isCurrent ? styles.active : ""}`}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DocumentSectionNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = getActiveDocumentSection(pathname, searchParams.get("tab"));

  return <DocumentSectionNavigationLinks active={active} />;
}

export function DocumentSectionNavigationFallback() {
  return <DocumentSectionNavigationLinks />;
}
