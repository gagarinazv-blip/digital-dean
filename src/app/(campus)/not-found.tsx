import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function CampusNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Страница не найдена</h1>
        <p className={styles.hint}>
          Проверьте адрес или вернитесь на главную страницу кабинета.
        </p>
        <Link className={styles.secondaryButton} href="/">
          На главную
        </Link>
      </section>
    </main>
  );
}
