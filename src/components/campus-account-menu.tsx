"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { logoutAction } from "@/app/profile/actions";
import styles from "./campus-layout.module.css";

export function CampusAccountMenu({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  return <CampusAccountMenuState key={routeKey} fullName={fullName} />;
}

function CampusAccountMenuState({ fullName }: { fullName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("ru-RU");

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        !(event.target instanceof Node) ||
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className={styles.accountMenu}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          !(nextTarget instanceof Node) ||
          !event.currentTarget.contains(nextTarget)
        ) {
          setIsOpen(false);
        }
      }}
      ref={menuRef}
    >
      <button
        aria-controls={isOpen ? "campus-account-popover" : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Меню аккаунта: ${fullName}`}
        className={styles.accountSummary}
        id="campus-account-trigger"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className={styles.avatar}>
          {initials}
        </span>
        <span className={styles.accountName} title={fullName}>
          {fullName}
        </span>
        <span aria-hidden="true" className={styles.chevron}>
          ⌄
        </span>
      </button>
      {isOpen && (
        <div
          aria-labelledby="campus-account-trigger"
          className={styles.accountPopover}
          id="campus-account-popover"
          role="menu"
        >
          <Link
            className={styles.accountMenuLink}
            href="/profile"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            Профиль
          </Link>
          <form action={logoutAction} role="none">
            <button
              className={styles.logout}
              role="menuitem"
              type="submit"
            >
              Выйти
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
