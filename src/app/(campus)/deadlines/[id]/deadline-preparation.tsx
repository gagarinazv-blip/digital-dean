"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { DeadlineProgressStatus } from "@/generated/prisma/enums";
import { deadlineProgressLabels } from "@/lib/campus-labels";
import {
  getChecklistProgress,
  setChecklistItemDone,
  type DeadlineChecklistItem,
} from "@/lib/deadline-progress";
import {
  setDeadlineStatusAction,
  toggleDeadlineChecklistItemAction,
  type DeadlineProgressActionResult,
} from "./actions";
import styles from "./deadline.module.css";

const statuses = Object.entries(deadlineProgressLabels) as Array<
  [DeadlineProgressStatus, string]
>;

type ProgressState = {
  checklist: DeadlineChecklistItem[];
  status: DeadlineProgressStatus;
};

type ProgressChange =
  | { kind: "item"; itemId: string; done: boolean }
  | { kind: "status"; status: DeadlineProgressStatus };

function applyChange(
  state: ProgressState,
  change: ProgressChange,
): ProgressState {
  return change.kind === "status"
    ? { ...state, status: change.status }
    : {
        ...state,
        checklist:
          setChecklistItemDone(state.checklist, change.itemId, change.done) ??
          state.checklist,
      };
}

export function DeadlinePreparation({
  checklist,
  deadlineId,
  status,
}: ProgressState & { deadlineId: string }) {
  const [state, addChange] = useOptimistic({ checklist, status }, applyChange);
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const progress = getChecklistProgress(state.checklist);

  function save(
    change: ProgressChange,
    action: () => Promise<DeadlineProgressActionResult>,
  ) {
    startTransition(async () => {
      addChange(change);
      setFailed(false);
      try {
        const result = await action();
        if (!result.ok) setFailed(true);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <section
      aria-labelledby="preparation"
      className={styles.panel}
    >
      <h2 id="preparation">Подготовка</h2>
      <fieldset className={styles.statuses}>
        <legend>Ваш статус</legend>
        <div className={styles.statusOptions}>
          {statuses.map(([value, label]) => (
            <label className={styles.statusOption} key={value}>
              <input
                checked={state.status === value}
                name="deadline-status"
                onChange={() =>
                  save({ kind: "status", status: value }, () =>
                    setDeadlineStatusAction(deadlineId, value),
                  )
                }
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={styles.hint}>
        Личная отметка: она не заменяет сдачу работы преподавателю.
      </p>
      <div className={styles.progress}>
        <label htmlFor="checklist-progress">Чек-лист</label>
        <output aria-live="polite">{progress.label}</output>
        <progress
          id="checklist-progress"
          max={progress.total}
          value={progress.done}
        />
      </div>
      <ul className={styles.checklist}>
        {state.checklist.map((item) => (
          <li key={item.id}>
            <label className={styles.checklistItem}>
              <input
                checked={item.done}
                onChange={(event) => {
                  const done = event.target.checked;
                  save({ kind: "item", itemId: item.id, done }, () =>
                    toggleDeadlineChecklistItemAction(
                      deadlineId,
                      item.id,
                      done,
                    ),
                  );
                }}
                type="checkbox"
              />
              <span>{item.text}</span>
            </label>
          </li>
        ))}
      </ul>
      {failed && (
        <p className={styles.saveError} role="alert">
          Не удалось сохранить отметку. Попробуйте ещё раз.
        </p>
      )}
    </section>
  );
}
