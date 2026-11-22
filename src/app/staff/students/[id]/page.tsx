import Link from "next/link";
import { notFound } from "next/navigation";
import type { StudentAuditAction } from "@/generated/prisma/enums";
import { getCorporateMailDomain } from "@/lib/corporate-mail";
import { getUniversityDateTimeFormatter } from "@/lib/campus-time";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { portfolioCategoryLabels } from "@/lib/portfolio-constants";
import { PortfolioItemControls } from "@/app/(campus)/documents/portfolio-controls";
import {
  ResetStudentAccessForm,
  UpdateStudentForm,
} from "../student-forms";
import styles from "../students.module.css";

const auditActionLabels: Record<StudentAuditAction, string> = {
  STUDENT_CREATED: "Создана учётная запись студента",
  PROFILE_UPDATED: "Обновлены данные студента",
  PHONE_CHANGED: "Изменён номер телефона",
  CORPORATE_EMAIL_CHANGED: "Изменён адрес корпоративной почты",
  CORPORATE_MAIL_PASSWORD_SET: "Задан пароль корпоративной почты",
  CORPORATE_MAIL_PASSWORD_REPLACED: "Заменён пароль корпоративной почты",
  CORPORATE_MAIL_PASSWORD_CLEARED: "Удалён пароль корпоративной почты",
  STUDENT_PASSWORD_SET: "Задан пароль студенческого кабинета",
  STUDENT_PASSWORD_REPLACED: "Заменён пароль студенческого кабинета",
  ACCESS_RESET: "Сброшен доступ студента",
  PORTFOLIO_ITEM_CREATED: "Добавлено достижение в портфолио",
  PORTFOLIO_ITEM_UPDATED: "Обновлено достижение в портфолио",
  PORTFOLIO_ITEM_DELETED: "Удалено достижение из портфолио",
  PORTFOLIO_FILE_DOWNLOADED: "Скачан файл студенческого портфолио",
  OPPORTUNITY_FILE_DOWNLOADED: "Скачан файл заявки на участие",
};

const changedFieldLabels: Record<string, string> = {
  fullName: "ФИО",
  phone: "номер телефона",
  faculty: "факультет",
  direction: "направление",
  course: "курс",
  group: "группа",
  corporateEmail: "корпоративная почта",
  corporateMailPassword: "пароль корпоративной почты",
  studentLoginPassword: "пароль студенческого кабинета",
  accountStatus: "статус доступа",
  activeSessions: "активные сессии",
};

const dateFormatter = getUniversityDateTimeFormatter({
  dateStyle: "medium",
  timeStyle: "short",
});

function getChangedFieldLabel(field: string): string {
  if (field.startsWith("portfolio:")) {
    return `название записи «${field.slice("portfolio:".length)}»`;
  }
  return changedFieldLabels[field] ?? field;
}

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export default async function StaffStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isManagerAccount } = await requireStaffContext();
  const id = parseId((await params).id);
  if (id === null) notFound();

  const [student, groups] = await Promise.all([
    getPrisma().student.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        faculty: true,
        direction: true,
        course: true,
        groupId: true,
        accountStatus: true,
        corporateEmail: true,
        corporateMailPasswordEncrypted: true,
        corporateMailIssuedAt: true,
        group: { select: { name: true } },
        portfolioItems: {
          orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            studentId: true,
            folderId: true,
            title: true,
            category: true,
            eventName: true,
            eventDate: true,
            role: true,
            description: true,
            originalName: true,
            mimeType: true,
            size: true,
            source: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        auditLogs: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
          select: {
            id: true,
            action: true,
            changedFields: true,
            createdAt: true,
            actor: {
              select: {
                login: true,
                staffProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    }),
    getPrisma().studentGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!student) notFound();

  const mailIssuedDate = student.corporateMailIssuedAt
    ? dateFormatter.format(student.corporateMailIssuedAt)
    : null;
  const mailDomain = getCorporateMailDomain();

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/staff">Рабочее место</Link>
        <span aria-hidden="true">/</span>
        <Link href="/staff/students">Студенты</Link>
        <span aria-hidden="true">/</span>
        <span>{student.fullName}</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>{student.fullName}</h1>
          <p>
            {student.accountStatus === "ACTIVE"
              ? "Учётная запись активна; пароль задан"
              : "Ожидает, пока сотрудник задаст пароль"}
          </p>
        </div>
        <span
          className={`${styles.status} ${
            student.accountStatus === "ACTIVE"
              ? styles.statusActive
              : styles.statusInvited
          }`}
        >
          {student.accountStatus === "ACTIVE" ? "Активен" : "Ожидает пароль"}
        </span>
      </header>

      <section className={styles.panel} aria-labelledby="student-edit-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="student-edit-title">Данные студента</h2>
            <p>
              {student.faculty} · {student.direction}
            </p>
          </div>
        </div>
        <UpdateStudentForm
          groups={groups}
          mailDomain={mailDomain}
          student={{
            id: student.id,
            fullName: student.fullName,
            phone: student.phone,
            course: student.course,
            groupId: student.groupId,
            corporateEmail: student.corporateEmail,
            mailPasswordSet: Boolean(student.corporateMailPasswordEncrypted),
            mailIssuedDate,
          }}
        />
      </section>

      <section className={styles.panel} aria-labelledby="access-reset-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="access-reset-title">Доступ к кабинету</h2>
            <p>
              Сброс завершит все сессии и задаст новый пароль. Студенту нужно
              войти заново по телефону и паролю.
            </p>
          </div>
        </div>
        <ResetStudentAccessForm studentId={student.id} />
      </section>

      <section className={styles.panel} aria-labelledby="audit-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="audit-title">Журнал изменений</h2>
            <p>Сохраняются действия и названия изменённых полей, не их секреты.</p>
          </div>
        </div>
        {student.auditLogs.length > 0 ? (
          <ol className={styles.auditList}>
            {student.auditLogs.map((entry) => (
              <li className={styles.auditItem} key={entry.id}>
                <div>
                  <strong>{auditActionLabels[entry.action]}</strong>
                  {entry.changedFields.length > 0 ? (
                    <p>
                      {entry.changedFields
                        .map(getChangedFieldLabel)
                        .join(", ")}
                    </p>
                  ) : null}
                  <span>
                    {entry.actor?.staffProfile?.fullName ??
                      entry.actor?.login ??
                      "Сотрудник недоступен"}
                    {" · "}
                    {dateFormatter.format(entry.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyState}>Изменений пока нет.</p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="portfolio-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="portfolio-title">Портфолио</h2>
            <p>Достижения студента и документы, загруженные деканатом.</p>
          </div>
          <Link
            className={styles.primaryButton}
            href={`/staff/achievements?studentId=${student.id}`}
          >
            Добавить достижение
          </Link>
        </div>
        {student.portfolioItems.length === 0 ? (
          <p className={styles.emptyState}>Записей пока нет.</p>
        ) : (
          <ul className={styles.auditList}>
            {student.portfolioItems.map((item) => (
              <li className={styles.auditItem} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {portfolioCategoryLabels[item.category]}
                    {item.eventName ? ` · ${item.eventName}` : ""}
                    {item.eventDate
                      ? ` · ${dateFormatter.format(item.eventDate)}`
                      : ""}
                  </p>
                  <span>
                    {item.source === "STAFF"
                      ? "Добавлено деканатом"
                      : "Добавлено студентом"}
                    {" · "}
                    <Link href={`/files/portfolio/${item.id}`}>Открыть файл</Link>
                    {" · "}
                    <Link href={`/files/portfolio/${item.id}?download=1`}>
                      Скачать
                    </Link>
                  </span>
                  <PortfolioItemControls
                    folders={[]}
                    isManager={isManagerAccount}
                    isStaff
                    item={item}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
