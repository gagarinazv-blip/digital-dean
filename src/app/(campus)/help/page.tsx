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
            Скоро здесь появится расписание. Пока уточните актуальные данные у
            деканата.
          </p>
          <Link className={styles.link} href="/schedule">Открыть расписание</Link>
        </section>
        <section className={styles.card}>
          <h2>Нужна справка или заявление?</h2>
          <p className={styles.description}>
            Скоро здесь можно будет смотреть статусы обращений. Порядок подачи
            уточните по официальным каналам вашего факультета.
          </p>
          <Link className={styles.link} href="/requests">Мои заявки</Link>
        </section>
        <section className={styles.card}>
          <h2>Не видите оценку?</h2>
          <p className={styles.description}>
            Раздел оценок появится скоро. По срокам публикации обратитесь к
            преподавателю или в деканат.
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
