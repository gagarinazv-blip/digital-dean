"use client";

import { EmptyState } from "@/components/empty-state";
import styles from "./notifications.module.css";

export default function NotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      action={
        <button onClick={reset} type="button">
          Повторить
        </button>
      }
      className={styles.errorState}
      description="Попробуйте ещё раз немного позже."
      illustration="error"
      role="alert"
      title="Не удалось загрузить уведомления"
    />
  );
}
