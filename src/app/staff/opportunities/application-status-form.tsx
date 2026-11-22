"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { updateOpportunityApplicationStatusAction } from "./actions-status";
import styles from "./opportunities.module.css";

const finalStatuses = new Set(["ACCEPTED", "REJECTED"]);

export function OpportunityApplicationStatusForm({
  applicationId,
  initialStatus,
  initialComment,
}: {
  applicationId: number;
  initialStatus: string;
  initialComment: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);

  return (
    <form action={updateOpportunityApplicationStatusAction} className={styles.statusForm}>
      <input type="hidden" name="id" value={applicationId} />
      <label>
        Новый статус
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.currentTarget.value)}
        >
          <option value="IN_REVIEW">На рассмотрении</option>
          <option value="NEEDS_INFO">Нужны уточнения</option>
          <option value="ACCEPTED">Одобрена</option>
          <option value="REJECTED">Отклонена</option>
          <option value="WITHDRAWN">Отозвана</option>
        </select>
      </label>
      <label>
        Комментарий студенту
        <textarea name="comment" maxLength={2000} defaultValue={initialComment} />
      </label>
      {finalStatuses.has(status) ? (
        <ConfirmationDialog
          buttonClassName={styles.statusButton}
          buttonLabel="Подтвердить решение"
          onOpenChange={setOpen}
          open={open}
          title={status === "ACCEPTED" ? "Одобрить заявку?" : "Отклонить заявку?"}
        >
          <p>Студент получит уведомление об изменении статуса.</p>
          <button className={styles.statusButton} type="submit">
            {status === "ACCEPTED" ? "Одобрить" : "Отклонить"}
          </button>
        </ConfirmationDialog>
      ) : (
        <button className={styles.statusButton} type="submit">
          Сохранить статус
        </button>
      )}
    </form>
  );
}
