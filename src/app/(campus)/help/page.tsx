import { Suspense } from "react";
import Link from "next/link";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { requireStudent } from "@/lib/student";
import styles from "../../sections.module.css";

async function HelpContent() {
  await requireStudent();

  return (
    <CampusSection
      eyebrow="Помощь"
      title="Справка"
      description="Куда посмотреть, если возник вопрос по учебе или кабинету."
    >
      <div className={styles.helpGrid}>
        <section className={styles.card}>
          <h2>Расписание изменилось?</h2>
          <p className={styles.description}>
            В расписании группы указаны время и аудитории занятий. Переносы и
            отмены отмечены отдельно.
          </p>
          <Link className={styles.link} href="/schedule">Открыть расписание</Link>
        </section>
        <section className={styles.card}>
          <h2>Нужна справка или заявление?</h2>
          <p className={styles.description}>
            Создайте обращение в разделе заявок. Статус, переписка и история
            доступны в карточке заявки.
          </p>
          <Link className={styles.link} href="/requests">Мои заявки</Link>
        </section>
        <section className={styles.card}>
          <h2>Не видите оценку?</h2>
          <p className={styles.description}>
            Учебный план, результаты аттестации и расписание сессии собраны в
            разделе оценок.
          </p>
          <Link className={styles.link} href="/grades">Мои оценки</Link>
        </section>
        <section className={styles.card}>
          <h2>Вопрос по личному кабинету?</h2>
          <p className={styles.description}>
            Проверьте имя и учебную группу в профиле. Если данные неверны,
            обратитесь в деканат по официальным каналам.
          </p>
          <Link className={styles.link} href="/profile">Открыть профиль</Link>
        </section>
      </div>
    </CampusSection>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<CampusLoading label="Справка" />}>
      <HelpContent />
    </Suspense>
  );
}
