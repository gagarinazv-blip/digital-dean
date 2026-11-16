import styles from "@/app/request-workflow.module.css";

export default function RequestLoading() {
  return (
    <main className={styles.stack} role="status" aria-live="polite">
      <section className={styles.panel}>
        <p className={styles.hint}>Загружаем заявку…</p>
      </section>
    </main>
  );
}
