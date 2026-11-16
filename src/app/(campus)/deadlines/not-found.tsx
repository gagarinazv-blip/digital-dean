import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function DeadlinesNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Сроки недоступны</h1>
        <p className={styles.hint}>Не удалось найти задания для вашего профиля.</p>
        <Link className={styles.secondaryButton} href="/">
          На главную
        </Link>
      </section>
    </main>
  );
}
