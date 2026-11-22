"use client";

import { useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { withdrawOpportunityAction } from "./actions";
import styles from "./applications/applications.module.css";

export function OpportunityApplicationWithdrawButton({
  publicId,
}: {
  publicId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <form action={withdrawOpportunityAction}>
      <input type="hidden" name="publicId" value={publicId} />
      <ConfirmationDialog
        buttonClassName={styles.withdrawButton}
        buttonLabel="Отозвать заявку"
        onOpenChange={setOpen}
        open={open}
        title="Отозвать заявку?"
      >
        <p>После отзыва можно будет отправить новую заявку на эту возможность.</p>
        <button className={styles.withdrawButton} type="submit">
          Отозвать
        </button>
      </ConfirmationDialog>
    </form>
  );
}
