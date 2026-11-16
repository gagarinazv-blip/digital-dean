import styles from "@/app/request-workflow.module.css";

export default function RequestLoading() {
  return (
    <main aria-busy="true" className={styles.loadingState} role="status">
      <p className={styles.hint}>Загружаем заявку…</p>
      <section aria-hidden="true" className={styles.stack}>
        <span className={styles.skeletonLine} />
        <span className={styles.skeletonBlock} />
        <span className={styles.skeletonBlock} />
      </section>
    </main>
  );
}
