"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  deleteOrArchiveOpportunityAction,
  duplicateOpportunityAction,
} from "./actions";
import styles from "./opportunities.module.css";

export function OpportunityListActions({
  opportunityId,
  hasApplications,
}: {
  opportunityId: number;
  hasApplications: boolean;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  return (
    <div className={styles.rowActions}>
      <form action={duplicateOpportunityAction}>
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <button className={styles.secondaryButton} type="submit">
          Скопировать
        </button>
      </form>
      <form action={deleteOrArchiveOpportunityAction}>
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <ConfirmationDialog
          buttonClassName={styles.dangerButton}
          buttonLabel={hasApplications ? "Архивировать" : "Удалить"}
          onOpenChange={setConfirmationOpen}
          open={confirmationOpen}
          title={hasApplications ? "Архивировать возможность?" : "Удалить возможность?"}
        >
          <p>
            {hasApplications
              ? "У возможности есть заявки. Данные заявок сохранятся, а возможность будет архивирована."
              : "Возможность будет удалена без возможности восстановления."}
          </p>
          <button className={styles.dangerButton} type="submit">
            {hasApplications ? "Архивировать" : "Удалить"}
          </button>
        </ConfirmationDialog>
      </form>
    </div>
  );
}
