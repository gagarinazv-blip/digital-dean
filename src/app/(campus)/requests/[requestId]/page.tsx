import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import { RequestConversation } from "@/components/request-conversation";
import { StudentReplyForm } from "@/app/(campus)/requests/request-forms";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import { getStudentRequest } from "@/lib/student-request-data";
import styles from "@/app/request-workflow.module.css";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

export default async function StudentRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = await getStudentRequest(requestId);

  return (
    <CampusSection
      eyebrow="Мои заявки"
      title={requestTypeLabels[request.type]}
      description={`Заявка №${request.id}`}
    >
      <div className={styles.stack}>
        <section className={styles.panel}>
          <span className={styles.statusBadge}>
            {requestStatusLabels[request.status]}
          </span>
          <div className={styles.metadata}>
            <p>Создана: {requestDateFormatter.format(request.createdAt)}</p>
            <p>Обновлена: {requestDateFormatter.format(request.updatedAt)}</p>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="student-thread-title">
          <h2 id="student-thread-title">Сообщения</h2>
          <RequestConversation messages={request.comments} />
        </section>

        {request.status === "NEEDS_INFO" ? (
          <section className={styles.panel} aria-labelledby="student-reply-title">
            <h2 id="student-reply-title">Нужно добавить данные</h2>
            <p className={styles.hint}>
              Ответьте сотруднику или приложите документы. После отправки
              сотрудник проверит информацию и продолжит работу.
            </p>
            <StudentReplyForm requestId={request.id} />
          </section>
        ) : (
          <p className={styles.notice}>
            Если сотруднику понадобятся дополнительные сведения, он напишет
            здесь.
          </p>
        )}

        <Link className={styles.secondaryButton} href="/requests">
          Вернуться к списку заявок
        </Link>
      </div>
    </CampusSection>
  );
}
