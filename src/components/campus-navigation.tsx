"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./campus-navigation.module.css";

const navigation = [
  { href: "/", label: "Главная", icon: "⌂" },
  { href: "/schedule", label: "Расписание", icon: "▦" },
  { href: "/grades", label: "Оценки", icon: "✓" },
  { href: "/requests", label: "Заявки", icon: "＋" },
  { href: "/notifications", label: "Уведомления", icon: "●" },
];

export function CampusNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Разделы кабинета">
      {navigation.map((item) => {
        const isCurrent =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={`${styles.navigationLink} ${isCurrent ? styles.active : ""}`}
            href={item.href}
            key={item.href}
          >
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
