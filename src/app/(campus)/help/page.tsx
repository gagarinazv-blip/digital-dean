import Link from "next/link";
import { CampusSection } from "@/components/campus-section";
import type { RequestStatus } from "@/generated/prisma/enums";
import { requestStatusLabels, requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  requestCatalog,
} from "@/lib/request-catalog";
import { getStudentRequests } from "@/lib/student-request-data";
import styles from "./help.module.css";

export const instant = false;

const requestDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeZone: "Europe/Moscow",
});

function requestStatusText(status: RequestStatus): string {
  return requestStatusLabels[status];
}

function ServiceIcon({ kind }: { kind: "certificate" | "call" }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {kind === "certificate" ? (
        <>
          <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v5h5M8 13h8M8 17h6" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
        </>
      )}
    </svg>
  );
}

export default async function HelpPage() {
  const requests = await getStudentRequests();

  return (
    <CampusSection
      eyebrow="Сервисы кампуса"
      title="Документы и заявки"
      description="Справки, обращения и прозрачное отслеживание."
    >
      <div className={styles.pageContent}>
        <section className={styles.hero} aria-label="Новая заявка">
          <div className={styles.heroArt} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.heroKicker}>Сервисы для студентов</p>
            <h2>Нужен документ или помощь деканата?</h2>
            <p>Оформите заявку онлайн и следите за её статусом в кабинете.</p>
            <Link className={styles.primaryButton} href="/requests/new">
              Новая заявка <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <div className={styles.filterBar} aria-hidden="true">
          <div className={styles.searchVisual}>
            <svg
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
            <span>Поиск услуги или заявки</span>
          </div>
          <div className={styles.filterVisual}>
            <span>Статус: все</span>
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </div>
        </div>

        <section className={styles.section} aria-labelledby="catalog-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Выберите подходящую услугу</p>
              <h2 id="catalog-title">Каталог услуг</h2>
            </div>
          </div>
          <div className={styles.serviceGrid}>
            {requestCatalog
              .filter((service) => service.active)
              .map((service) => (
                <article className={styles.serviceCard} key={service.code}>
                  <span className={styles.serviceIcon}>
                    <ServiceIcon
                      kind={
                        service.code === "CALL_CERTIFICATE"
                          ? "call"
                          : "certificate"
                      }
                    />
                  </span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className={styles.serviceMeta}>
                    Электронно · до {service.executionDays} рабочих дней
                  </span>
                  <Link className={styles.serviceLink} href="/requests/new">
                    Выбрать услугу <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="requests-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>История обращений</p>
              <h2 id="requests-title">Мои заявки · {requests.length}</h2>
            </div>
            <Link className={styles.secondaryLink} href="/requests">
              Все заявки <span aria-hidden="true">↗</span>
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <ServiceIcon kind="certificate" />
              </span>
              <h3>Заявок пока нет</h3>
              <p>Выберите услугу в каталоге, чтобы отправить первое обращение.</p>
            </div>
          ) : (
            <>
              <div className={styles.tableScroller}>
                <table className={styles.requestTable}>
                  <thead>
                    <tr>
                      <th scope="col">Номер</th>
                      <th scope="col">Студент</th>
                      <th scope="col">Услуга</th>
                      <th scope="col">Подана</th>
                      <th scope="col">Статус</th>
                      <th scope="col">
                        <span className={styles.visuallyHidden}>Открыть</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request, index) => (
                      <tr
                        className={index === 0 ? styles.selectedRow : ""}
                        key={request.id}
                      >
                        <td>
                          <Link
                            className={styles.requestNumber}
                            href={`/requests/${request.publicId}`}
                            title={request.publicId}
                          >
                            № {request.publicId.slice(0, 8).toUpperCase()}
                          </Link>
                        </td>
                        <td>Вы</td>
                        <td>
                          {getRequestCatalogTitle(
                            request.catalogCode,
                            requestTypeLabels[request.type],
                          )}
                        </td>
                        <td>
                          {requestDateFormatter.format(request.createdAt)}
                        </td>
                        <td>
                          <span
                            className={styles.statusBadge}
                            data-status={request.status}
                          >
                            {requestStatusText(request.status)}
                          </span>
                        </td>
                        <td>
                          <Link
                            aria-label={`Открыть заявку ${request.publicId}`}
                            className={styles.rowLink}
                            href={`/requests/${request.publicId}`}
                          >
                            <span aria-hidden="true">›</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className={styles.mobileRequestList}>
                {requests.map((request, index) => (
                  <li
                    className={`${styles.mobileRequestCard} ${
                      index === 0 ? styles.mobileSelected : ""
                    }`}
                    key={request.id}
                  >
                    <Link
                      className={styles.mobileRequestLink}
                      href={`/requests/${request.publicId}`}
                    >
                      <div className={styles.mobileRequestHeading}>
                        <span className={styles.requestNumber}>
                          № {request.publicId.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={styles.statusBadge}
                          data-status={request.status}
                        >
                          {requestStatusText(request.status)}
                        </span>
                      </div>
                      <strong>
                        {getRequestCatalogTitle(
                          request.catalogCode,
                          requestTypeLabels[request.type],
                        )}
                      </strong>
                      <span className={styles.mobileRequestMeta}>
                        Вы · {requestDateFormatter.format(request.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </CampusSection>
  );
}
