import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeadlineHandIn } from "@/components/deadline-hand-in";
import { DeadlineRemaining } from "@/components/deadline-remaining";
import {
  cleanStudentFacingText,
  deadlineFormatLabels,
} from "@/lib/campus-labels";
import { formatMoscowDateTime, getMoscowDateKey } from "@/lib/campus-time";
import { getDeadlineCalendarHref } from "@/lib/deadline-action";
import { getStudentDeadline } from "@/lib/deadline-data";
import { getChecklistProgress } from "@/lib/deadline-progress";
import {
  canRemindOneDayBefore,
  getDeadlineRemaining,
} from "@/lib/deadline-utils";
import { getDemoNow } from "@/lib/demo-date";
import { requireStudent } from "@/lib/student";
import workflowStyles from "@/app/request-workflow.module.css";
import { DeadlineMaterials } from "./deadline-materials";
import { DeadlinePreparation } from "./deadline-preparation";
import { DeadlineSkeleton } from "./deadline-skeleton";
import styles from "./deadline.module.css";

type DeadlinePageProps = { params: Promise<{ id: string }> };

export default function DeadlinePage({ params }: DeadlinePageProps) {
  return (
    <Suspense fallback={<DeadlineSkeleton />}>
      <DeadlineContent params={params} />
    </Suspense>
  );
}

async function DeadlineContent({ params }: DeadlinePageProps) {
  const student = await requireStudent();
  const { id } = await params;
  const deadline = await getStudentDeadline(id, student.id);
  if (!deadline) notFound();

  const now = getDemoNow();
  const title = cleanStudentFacingText(deadline.title);
  const subject = cleanStudentFacingText(deadline.subject);
  const dueIso = deadline.dueAt.toISOString();
  const dueLabel = formatMoscowDateTime(deadline.dueAt);
  const dueDateKey = getMoscowDateKey(deadline.dueAt);
  const submitted = deadline.status === "SUBMITTED";
  const remaining = submitted
    ? null
    : getDeadlineRemaining(deadline.dueAt, now, deadline.format);
  const canRemind = canRemindOneDayBefore(deadline.dueAt, now);
  const checklistProgress = getChecklistProgress(deadline.progress.checklist);
  const disciplineHref = deadline.disciplineId
    ? `/grades/${encodeURIComponent(deadline.disciplineId)}`
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav aria-label="Хлебные крошки">
          <ol className={styles.breadcrumbs}>
            <li>
              <Link href="/deadlines">Дедлайны</Link>
            </li>
            <li>
              {disciplineHref ? (
                <Link href={disciplineHref}>{subject}</Link>
              ) : (
                <span>{subject}</span>
              )}
            </li>
          </ol>
        </nav>
        <div className={styles.headerGrid}>
          <div className={styles.headline}>
            <ul aria-label="Дисциплина и формат" className={styles.badges}>
              <li className={styles.badge}>{subject}</li>
              <li className={styles.badge} data-kind="format">
                {deadlineFormatLabels[deadline.format]}
              </li>
            </ul>
            <h1>{title}</h1>
            {deadline.topic && (
              <p className={styles.topic}>Тема: {deadline.topic}</p>
            )}
            <p className={styles.quickLinks}>
              <a href="#preparation">Подготовка: {checklistProgress.label}</a>
              <a href="#materials">Материалы: {deadline.materials.length}</a>
            </p>
          </div>
          <DeadlineRemaining
            dueIso={dueIso}
            dueLabel={dueLabel}
            remaining={remaining}
          />
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section aria-labelledby="about-title" className={styles.panel}>
            <h2 id="about-title">О работе</h2>
            <div className={styles.block}>
              <h3>Тема</h3>
              <p>{deadline.topic ?? "Тема пока не указана."}</p>
            </div>
            <div className={styles.block}>
              <h3>Описание</h3>
              <p className={styles.description}>
                {deadline.description
                  ? cleanStudentFacingText(deadline.description)
                  : "Преподаватель пока не добавил описание."}
              </p>
            </div>
            {deadline.criteria.length > 0 && (
              <div className={styles.block}>
                <h3>Критерии оценивания</h3>
                <ul className={styles.criteria}>
                  {deadline.criteria.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.block}>
              <h3>Как сдавать</h3>
              <DeadlineHandIn
                deadlineId={deadline.id}
                dueLabel={dueLabel}
                format={deadline.format}
                location={deadline.location}
                taskUrl={deadline.taskUrl}
              />
            </div>
          </section>

          <DeadlinePreparation
            checklist={deadline.progress.checklist}
            deadlineId={deadline.id}
            status={deadline.progress.status}
          />

          <DeadlineMaterials materials={deadline.materials} />
        </div>

        <aside aria-labelledby="summary-title" className={styles.sidebar}>
          <h2 id="summary-title">Срок и действия</h2>
          <div className={styles.summary}>
            <strong>{remaining?.label ?? "Сдано"}</strong>
            <time dateTime={dueIso}>{dueLabel}</time>
          </div>
          <div className={styles.sidebarActions}>
            <a
              className={workflowStyles.secondaryButton}
              download
              href={getDeadlineCalendarHref(deadline.id)}
            >
              Добавить в календарь
            </a>
            {canRemind ? (
              <>
                <a
                  aria-describedby="reminder-hint"
                  className={workflowStyles.secondaryButton}
                  download
                  href={getDeadlineCalendarHref(deadline.id, true)}
                >
                  Напомнить за 1 день
                </a>
                <p className={styles.hint} id="reminder-hint">
                  Скачается событие календаря с напоминанием за сутки.
                </p>
              </>
            ) : (
              <p className={styles.hint}>
                До срока меньше суток — напоминание за день недоступно.
              </p>
            )}
          </div>
          <ul className={styles.sidebarLinks}>
            {disciplineHref && (
              <li>
                <Link href={disciplineHref}>Страница дисциплины</Link>
              </li>
            )}
            <li>
              <Link
                href={`/schedule?view=week&date=${dueDateKey}&day=${dueDateKey}`}
              >
                Расписание на день срока
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
