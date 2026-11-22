import Link from "next/link";
import { NavArrowRight } from "iconoir-react";
import { CampusSection } from "@/components/campus-section";
import { DateTimeStack } from "@/components/date-time-stack";
import { EmptyState } from "@/components/empty-state";
import controls from "@/components/ui/controls.module.css";
import {
  cleanStudentFacingText,
  deadlineFormatLabels,
} from "@/lib/campus-labels";
import { getDeadlineHref } from "@/lib/deadline-action";
import { getStudentDeadlines } from "@/lib/deadline-data";
import {
  getChecklistProgress,
  readDeadlineChecklist,
} from "@/lib/deadline-progress";
import { getDeadlineWeight } from "@/lib/deadline-weight";
import { getDemoNow } from "@/lib/demo-date";
import { pluralize } from "@/lib/plural";
import { joinDetails } from "@/lib/room-format";
import { requireStudent } from "@/lib/student";
import { groupTasks } from "@/lib/task-groups";
import styles from "./deadlines.module.css";

export const instant = false;

type Task = Awaited<ReturnType<typeof getStudentDeadlines>>[number];

function TaskCard({ task }: { task: Task }) {
  const isSubmitted = task.status === "SUBMITTED";
  const weight = getDeadlineWeight(task);
  const progress = getChecklistProgress(
    readDeadlineChecklist(task.progress[0]?.checklist, task.format),
  );
  const materials = task._count.materials;

  return (
    <li id={`deadline-${task.id}`}>
      <Link className={styles.task} href={getDeadlineHref(task.id)}>
        <span className={styles.main}>
          <span className={styles.title}>
            {cleanStudentFacingText(task.title)}
          </span>
          <span className={styles.details}>
            {joinDetails(
              cleanStudentFacingText(task.subject),
              deadlineFormatLabels[task.format],
              materials > 0 &&
                `${materials} ${pluralize(materials, "материал", "материала", "материалов")}`,
            )}
          </span>
        </span>
        <span className={styles.facts}>
          <span className={styles.fact}>
            {weight ? (
              <>
                <span className={styles.value}>{weight.percent}%</span>
                <span className={styles.caption}>
                  {weight.isShared ? "за весь раздел" : "вес в оценке"}
                </span>
              </>
            ) : null}
          </span>
          <span className={styles.fact}>
            <span className={styles.value}>
              {progress.done}/{progress.total}
            </span>
            <span className={styles.caption}>шагов готово</span>
          </span>
        </span>
        <span className={styles.due}>
          {isSubmitted ? (
            <span className={controls.badge} data-tone="success">
              Сдано
            </span>
          ) : null}
          <DateTimeStack
            done={isSubmitted}
            kind="deadline"
            value={task.dueAt}
          />
        </span>
        <NavArrowRight aria-hidden="true" className={styles.arrow} />
      </Link>
    </li>
  );
}

export default async function DeadlinesPage() {
  const student = await requireStudent();
  const { groups, submitted } = groupTasks(
    await getStudentDeadlines(student.id),
    getDemoNow(),
  );

  return (
    <CampusSection
      description="Что сдать, сколько осталось и сколько это весит в оценке."
      eyebrow="Учёба"
      illustration="grades"
      title="Задания"
      tone="sage"
    >
      {groups.length === 0 ? (
        <EmptyState
          className={styles.empty}
          description="Новые задания появятся здесь, когда преподаватель их добавит."
          illustration="documents"
          title="Актуальных заданий нет"
        />
      ) : (
        groups.map((group) => (
          <section
            aria-labelledby={`tasks-${group.key}`}
            className={styles.group}
            key={group.key}
          >
            <h2 data-tone={group.key} id={`tasks-${group.key}`}>
              {group.title} <span>{group.tasks.length}</span>
            </h2>
            <ul className={styles.list}>
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))
      )}
      {submitted.length > 0 ? (
        <details className={styles.submitted}>
          <summary>Сданные: {submitted.length}</summary>
          <ul className={styles.list}>
            {submitted.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        </details>
      ) : null}
    </CampusSection>
  );
}
