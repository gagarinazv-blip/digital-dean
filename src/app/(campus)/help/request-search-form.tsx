"use client";

import type { RequestStatus } from "@/generated/prisma/enums";
import { requestStatusLabels } from "@/lib/campus-labels";
import styles from "./help.module.css";

const requestStatuses = Object.keys(requestStatusLabels) as RequestStatus[];

export function RequestSearchForm({
  search,
  status,
  routeBase = "/requests",
}: {
  search: string;
  status: RequestStatus | "";
  routeBase?: "/help" | "/requests";
}) {
  return (
    <form
      action={routeBase}
      className={styles.requestFilters}
      method="get"
      role="search"
    >
      <input name="tab" type="hidden" value="requests" />
      <label className={styles.searchField}>
        <span className={styles.visuallyHidden}>Поиск по заявкам</span>
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          defaultValue={search}
          name="q"
          placeholder="Поиск по заявкам (номер, услуга)"
          type="search"
        />
      </label>
      <label className={styles.statusFilter}>
        <span className={styles.visuallyHidden}>Статус заявки</span>
        <select
          defaultValue={status}
          name="status"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">Статус: все</option>
          {requestStatuses.map((requestStatus) => (
            <option key={requestStatus} value={requestStatus}>
              {requestStatusLabels[requestStatus]}
            </option>
          ))}
        </select>
      </label>
      <button className={styles.visuallyHidden} type="submit">
        Применить фильтры
      </button>
    </form>
  );
}
