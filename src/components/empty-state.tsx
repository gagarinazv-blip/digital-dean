import type { ReactNode } from "react";
import { SectionArt, type SectionIllustration } from "@/components/section-art";
import styles from "./empty-state.module.css";

export type EmptyStateIllustration =
  | "schedule"
  | "notifications"
  | "requests"
  | "documents"
  | "error"
  | "session"
  | "search";

const illustrations: Record<EmptyStateIllustration, ReactNode> = {
  schedule: (
    <>
      <rect x="22" y="24" width="68" height="60" rx="12" />
      <path d="M36 19v13m40-13v13M22 42h68" />
      <path d="M38 56h12m12 0h12M38 68h12" />
      <circle cx="74" cy="68" r="13" className={styles.accent} />
      <path d="M74 61v8l5 3" className={styles.accent} />
    </>
  ),
  notifications: (
    <>
      <path d="M29 70h54c-8-8-9-15-9-28a18 18 0 0 0-36 0c0 13-1 20-9 28Z" />
      <path d="M45 79a11 11 0 0 0 22 0" className={styles.accent} />
      <path d="M52 22h8" />
      <circle cx="80" cy="31" r="5" className={styles.accent} />
    </>
  ),
  requests: (
    <>
      <path d="M34 20h30l16 16v48a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8Z" />
      <path d="M64 21v16h16M40 52h25M40 64h25" />
      <circle cx="72" cy="73" r="14" className={styles.accent} />
      <path d="m66 73 4 4 8-9" className={styles.accent} />
    </>
  ),
  documents: (
    <>
      <path d="M34 20h30l16 16v48a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8Z" />
      <path d="M64 21v16h16M40 52h24M40 64h12" />
      <path d="m58 74 7 7 14-16" className={styles.accent} />
    </>
  ),
  error: (
    <>
      <path d="m56 20 38 66H18l38-66Z" />
      <path d="M56 43v20" className={styles.accent} />
      <circle cx="56" cy="73" r="2.5" className={styles.accent} />
    </>
  ),
  session: (
    <>
      <rect x="24" y="28" width="64" height="56" rx="11" />
      <path d="M38 22v13m36-13v13M24 45h64" />
      <circle cx="56" cy="64" r="13" className={styles.accent} />
      <path d="M56 57v8l6 3" className={styles.accent} />
      <path d="m79 18 2-4m9 12 4-1" />
    </>
  ),
  search: (
    <>
      <circle cx="50" cy="48" r="25" />
      <path d="m68 66 19 19" className={styles.accent} />
      <path d="M40 48h20m-10-10v20" />
    </>
  ),
};

export function EmptyState({
  illustration,
  art,
  title,
  description,
  action,
  className,
  role,
  ariaLive,
  headingLevel,
}: {
  illustration: EmptyStateIllustration;
  /** Крупный рисунок вместо значка — для пустых экранов, а не карточек. */
  art?: SectionIllustration;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
  ariaLive?: "polite" | "assertive" | "off";
  headingLevel?: "h1" | "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <div
      aria-live={ariaLive}
      className={`${styles.emptyState} ${className ?? ""}`}
      role={role}
    >
      {art ? (
        <SectionArt className={styles.art} name={art} />
      ) : (
      <svg
        aria-hidden="true"
        className={styles.illustration}
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 112 112"
      >
        {illustrations[illustration]}
      </svg>
      )}
      {Heading ? (
        <Heading className={styles.title}>{title}</Heading>
      ) : (
        <strong className={styles.title}>{title}</strong>
      )}
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
