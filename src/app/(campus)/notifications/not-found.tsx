import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function NotificationNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Уведомление или его цель недоступны</h1>
        <p className={styles.hint}>
          Возможно, ссылка устарела или элемент больше недоступен.
        </p>
        <Link className={styles.secondaryButton} href="/notifications">
          Вернуться к уведомлениям
        </Link>
      </section>
    </main>
  );
}
