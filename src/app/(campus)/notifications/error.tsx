"use client";

import styles from "./notifications.module.css";

export default function NotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.errorState} role="alert">
      <strong>Не удалось загрузить уведомления</strong>
      <p>Попробуйте ещё раз немного позже.</p>
      <button onClick={reset} type="button">
        Повторить
      </button>
    </div>
  );
}
