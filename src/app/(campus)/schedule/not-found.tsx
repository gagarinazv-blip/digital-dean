import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import styles from "./schedule.module.css";

export default function ScheduleNotFound() {
  return (
    <EmptyState
      action={<Link href="/schedule">Открыть расписание</Link>}
      className={styles.scheduleError}
      description="Проверьте ссылку или вернитесь к расписанию своей группы."
      headingLevel="h2"
      illustration="search"
      title="Занятие или дата не найдены"
    />
  );
}
