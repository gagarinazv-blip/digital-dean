import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function DeadlineNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Дедлайн не найден</h1>
        <p className={styles.hint}>Проверьте ссылку или откройте список сроков.</p>
        <Link className={styles.secondaryButton} href="/deadlines">
          Все дедлайны
        </Link>
      </section>
    </main>
  );
}
