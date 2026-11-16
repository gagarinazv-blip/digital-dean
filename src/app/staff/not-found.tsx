import Link from "next/link";
import styles from "@/app/request-workflow.module.css";

export default function StaffNotFound() {
  return (
    <main className={styles.stack}>
      <section className={styles.panel}>
        <h1>Заявка не найдена</h1>
        <p className={styles.hint}>
          Заявка не существует или недоступна вашей учётной записи.
        </p>
        <Link className={styles.secondaryButton} href="/staff">
          К очереди заявок
        </Link>
      </section>
    </main>
  );
}
