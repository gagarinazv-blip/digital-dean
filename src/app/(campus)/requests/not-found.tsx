import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function RequestNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Заявка не найдена</h1>
        <p className={styles.hint}>
          Возможно, ссылка устарела или заявка недоступна.
        </p>
        <Link className={styles.secondaryButton} href="/help?tab=requests">
          Вернуться к моим заявкам
        </Link>
      </section>
    </main>
  );
}
