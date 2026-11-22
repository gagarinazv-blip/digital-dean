"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./opportunity-section-navigation.module.css";

const links = [
  { href: "/opportunities/catalog", label: "Каталог" },
  { href: "/opportunities/applications", label: "Мои заявки на участие" },
  { href: "/opportunities/portfolio", label: "Портфолио" },
];

export function OpportunitySectionNavigation() {
  const pathname = usePathname();
  const activeHref = pathname.startsWith("/opportunities/applications")
    ? "/opportunities/applications"
    : pathname.startsWith("/opportunities/portfolio")
      ? "/opportunities/portfolio"
      : "/opportunities/catalog";

  return (
    <nav className={styles.nav} aria-label="Раздел Возможности">
      {links.map((link) => (
        <Link
          key={link.href}
          className={styles.link}
          href={link.href}
          aria-current={activeHref === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
