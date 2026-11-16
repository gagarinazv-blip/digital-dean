"use client";

import Link from "next/link";
import { onest } from "./fonts";
import "./globals.css";
import styles from "@/app/request-workflow.module.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html className={onest.variable} lang="ru">
      <body>
        <main className={styles.stack}>
          <section className={styles.panel} role="alert">
            <h1>Что-то пошло не так</h1>
            <p className={styles.hint}>
              Обновите страницу или вернитесь к своим заявкам.
            </p>
            <div className={styles.errorActions}>
              <button className={styles.button} onClick={reset} type="button">
                Повторить
              </button>
              <Link className={styles.secondaryButton} href="/requests">
                Вернуться к моим заявкам
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
