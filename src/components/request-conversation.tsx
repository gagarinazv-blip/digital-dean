import { DateTimeStack } from "@/components/date-time-stack";
import type { RequestCommentVisibility, UserRole } from "@/generated/prisma/enums";
import styles from "@/app/request-workflow.module.css";

type RequestMessage = {
  id: number;
  content: string;
  visibility?: RequestCommentVisibility;
  createdAt: Date;
  author: {
    role: UserRole;
    student?: { fullName: string } | null;
    staffProfile?: { fullName: string } | null;
  };
  attachments: {
    id: number;
    fileName: string;
    sizeBytes: number;
  }[];
};

function formatFileSize(sizeBytes: number): string {
  return sizeBytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(sizeBytes / 1024))} КБ`
    : `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function RequestConversation({
  messages,
  showVisibility = false,
  hideAuthorNames = false,
}: {
  messages: readonly RequestMessage[];
  showVisibility?: boolean;
  hideAuthorNames?: boolean;
}) {
  if (messages.length === 0) {
    return (
      <p className={styles.empty}>
        Сообщений пока нет. Если нужны данные, они появятся здесь.
      </p>
    );
  }

  return (
    <ol className={styles.conversation}>
      {messages.map((message) => {
        const isInternal = message.visibility === "INTERNAL";
        const authorName = hideAuthorNames
          ? message.author.role === "STAFF"
            ? "Сотрудник"
            : "Студент"
          : (message.author.staffProfile?.fullName ??
            message.author.student?.fullName ??
            (message.author.role === "STAFF" ? "Сотрудник" : "Студент"));

        return (
          <li
            className={`${styles.message} ${isInternal ? styles.internalMessage : ""}`}
            key={message.id}
          >
            <div className={styles.messageHeader}>
              <strong>{authorName}</strong>
              <span className={styles.messageMeta}>
                <DateTimeStack align="end" value={message.createdAt} />
                {showVisibility && (
                  <span>{isInternal ? "Только сотрудникам" : "Видно студенту"}</span>
                )}
              </span>
            </div>
            <p className={styles.messageBody}>
              {message.content || "Документы приложены к сообщению."}
            </p>
            {message.attachments.length > 0 && (
              <ul className={styles.attachmentList}>
                {message.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      className={styles.attachmentLink}
                      href={`/api/request-attachments/${attachment.id}`}
                    >
                      {attachment.fileName} · {formatFileSize(attachment.sizeBytes)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
