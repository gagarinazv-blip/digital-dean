import { Suspense } from "react";
import type { StudyForm } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";
import { CorporateMailCard } from "./corporate-mail-card";
import { getStudentFacingGroupName } from "@/lib/campus-labels";
import { getAvatarInitials, getAvatarTone } from "@/lib/avatar";
import styles from "./profile.module.css";

const studyFormLabels: Record<StudyForm, string> = {
  FULL_TIME: "Очная",
  PART_TIME: "Очно-заочная",
  CORRESPONDENCE: "Заочная",
};

function ProfileFallback() {
  return (
    <main className={styles.page} aria-busy="true">
      Загрузка профиля…
    </main>
  );
}

async function ProfileContent() {
  const { student } = await requireStudentContext();
  const mailCredentials = await getPrisma().student.findUnique({
    where: { id: student.id },
    select: {
      corporateEmail: true,
      corporateMailPasswordEncrypted: true,
      corporateMailIssuedAt: true,
    },
  });
  const mailIsIssued = Boolean(
    mailCredentials?.corporateEmail &&
      mailCredentials.corporateMailPasswordEncrypted &&
      mailCredentials.corporateMailIssuedAt,
  );
  const mailIssuedAt = mailIsIssued
    ? mailCredentials?.corporateMailIssuedAt ?? null
    : null;
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="profile-title">
        <p className={styles.eyebrow}>Личный кабинет</p>
        <h1 id="profile-title">Профиль</h1>

        <section className={styles.profileHero} aria-label="Профиль студента">
          <div
            className={styles.avatar}
            data-tone={getAvatarTone(student.fullName)}
            aria-hidden="true"
          >
            {getAvatarInitials(student.fullName)}
          </div>
          <div className={styles.profileIdentity}>
            <p className={styles.identityLabel}>Студент</p>
            <h2>{student.fullName}</h2>
            <p className={styles.identityMeta}>
              {student.course} курс · группа{" "}
              {getStudentFacingGroupName(student.group.name)}
            </p>
          </div>
          {/* Декоративный SVG: оптимизация next/image для вектора не нужна. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className={styles.heroIllustration}
            decoding="async"
            height={768}
            src="/illustrations/profile.svg"
            width={1024}
          />
          <span className={styles.heroAccent} aria-hidden="true" />
        </section>

        <section
          aria-labelledby="study-information-title"
          className={styles.information}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>Образовательная программа</p>
              <h2 id="study-information-title">Учебная информация</h2>
            </div>
            <span className={styles.readOnly}>Только для просмотра</span>
          </div>

          <dl className={styles.details}>
            <div className={styles.detailCard}>
              <dt>Факультет</dt>
              <dd>{student.faculty}</dd>
            </div>
            <div className={styles.detailCard}>
              <dt>Направление</dt>
              <dd>{student.direction}</dd>
            </div>
            <div className={styles.detailCard}>
              <dt>Курс</dt>
              <dd>{student.course}</dd>
            </div>
            <div className={styles.detailCard}>
              <dt>Группа</dt>
              <dd>{getStudentFacingGroupName(student.group.name)}</dd>
            </div>
            <div className={styles.detailCard}>
              <dt>Зачётная книжка</dt>
              <dd>{student.recordBookNumber ?? "Не указана"}</dd>
            </div>
            <div className={styles.detailCard}>
              <dt>Форма обучения</dt>
              <dd>
                {student.studyForm
                  ? studyFormLabels[student.studyForm]
                  : "Не указана"}
              </dd>
            </div>
          </dl>
        </section>

        <CorporateMailCard
          email={
            mailIsIssued ? mailCredentials?.corporateEmail ?? null : null
          }
          issuedAt={mailIssuedAt ?? null}
        />
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
