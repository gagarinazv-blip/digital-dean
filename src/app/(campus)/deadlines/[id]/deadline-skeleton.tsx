import styles from "./deadline.module.css";

export function DeadlineSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Загружаем дедлайн"
      className={styles.page}
    >
      <div aria-hidden="true" className={styles.skeletonHeader} />
      <div aria-hidden="true" className={styles.columns}>
        <div className={styles.mainColumn}>
          <span className={styles.skeletonPanel} />
          <span className={styles.skeletonPanel} />
          <span className={styles.skeletonPanel} />
        </div>
        <span className={styles.skeletonPanel} />
      </div>
    </main>
  );
}
