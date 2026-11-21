"use client";

import { useEffect } from "react";
import styles from "./schedule.module.css";

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Не удалось загрузить расписание.", error);
  }, [error]);

  return (
    <section className={styles.scheduleError} role="alert">
      <strong>Не удалось загрузить расписание</strong>
      <p>Попробуйте обновить данные. Ваши занятия не изменены.</p>
      <button onClick={reset} type="button">
        Повторить
      </button>
    </section>
  );
}
