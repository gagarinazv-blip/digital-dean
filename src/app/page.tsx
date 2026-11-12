import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Цифровой деканат</h1>
      <p className={styles.muted}>
        Сервис для студентов и сотрудников факультета.
      </p>
    </main>
  );
}
