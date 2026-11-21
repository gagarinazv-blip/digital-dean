import Link from "next/link";
import styles from "./schedule.module.css";

export default function ScheduleNotFound() {
  return (
    <section className={styles.scheduleError}>
      <strong>Занятие или дата не найдены</strong>
      <p>Проверьте ссылку или вернитесь к расписанию своей группы.</p>
      <Link href="/schedule">Открыть расписание</Link>
    </section>
  );
}
