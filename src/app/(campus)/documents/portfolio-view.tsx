import Link from "next/link";
import type { PortfolioSource } from "@/generated/prisma/enums";
import type { PortfolioCategory } from "@/lib/portfolio-constants";
import { portfolioCategoryLabels } from "@/lib/portfolio-constants";
import { isPortfolioCategory } from "@/lib/portfolio-validation";
import {
  PortfolioFolderManager,
  PortfolioItemControls,
} from "./portfolio-controls";
import { PortfolioUploadForm } from "./portfolio-upload-form";
import styles from "./portfolio.module.css";

type Folder = { id: number; name: string };
type Item = {
  id: number;
  studentId: number;
  folderId: number | null;
  title: string;
  category: PortfolioCategory;
  eventName: string | null;
  eventDate: Date | null;
  role: string | null;
  description: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  source: PortfolioSource;
  createdAt: Date;
  updatedAt: Date;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeZone: "Europe/Moscow",
});

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

function makeHref(
  folder: string,
  query: string,
  category: string,
  year: string,
): string {
  const params = new URLSearchParams({ tab: "portfolio" });
  if (folder) params.set("folder", folder);
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (year) params.set("year", year);
  return `/documents?${params.toString()}`;
}

export function PortfolioView({
  folders,
  items,
  searchParams,
}: {
  folders: Folder[];
  items: Item[];
  searchParams: {
    q?: string | string[];
    category?: string | string[];
    year?: string | string[];
    folder?: string | string[];
  };
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 100) : "";
  const rawCategory =
    typeof searchParams.category === "string" ? searchParams.category : "";
  const category = isPortfolioCategory(rawCategory) ? rawCategory : "";
  const year =
    typeof searchParams.year === "string" &&
    /^\d{4}$/.test(searchParams.year) &&
    Number(searchParams.year) >= 1900 &&
    Number(searchParams.year) <= 2100
      ? searchParams.year
      : "";
  const folder =
    typeof searchParams.folder === "string" ? searchParams.folder : "";
  const selectedFolder = folders.find((item) => String(item.id) === folder);
  const normalizedQuery = query.toLocaleLowerCase("ru-RU");
  const visibleItems = items.filter((item) => {
    if (folder === "root" && item.folderId !== null) return false;
    if (folder === "staff" && item.source !== "STAFF") return false;
    if (selectedFolder && item.folderId !== selectedFolder.id) return false;
    if (!selectedFolder && folder && !["root", "staff", "all"].includes(folder)) {
      return false;
    }
    if (category && item.category !== category) return false;
    if (year && item.eventDate?.getUTCFullYear() !== Number(year)) return false;
    return (
      !normalizedQuery ||
      item.title.toLocaleLowerCase("ru-RU").includes(normalizedQuery)
    );
  });
  const availableYears = [
    ...new Set(
      items
        .flatMap((item) => (item.eventDate ? [item.eventDate.getUTCFullYear()] : []))
        .sort((left, right) => right - left),
    ),
  ];

  return (
    <div className={styles.portfolio}>
      <aside className={styles.sidebar} aria-label="Папки портфолио">
        <nav className={styles.folderNav} aria-label="Фильтр портфолио">
          <Link
            aria-current={!folder || folder === "all" ? "page" : undefined}
            className={styles.folderLink}
            href={makeHref("all", query, category, year)}
          >
            Все записи <span>{items.length}</span>
          </Link>
          <Link
            aria-current={folder === "root" ? "page" : undefined}
            className={styles.folderLink}
            href={makeHref("root", query, category, year)}
          >
            Без папки
          </Link>
          <Link
            aria-current={folder === "staff" ? "page" : undefined}
            className={styles.folderLink}
            href={makeHref("staff", query, category, year)}
          >
            От деканата
          </Link>
          {folders.map((item) => (
            <Link
              aria-current={folder === String(item.id) ? "page" : undefined}
              className={styles.folderLink}
              href={makeHref(String(item.id), query, category, year)}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <PortfolioFolderManager folders={folders} />
      </aside>

      <section className={styles.results} aria-labelledby="portfolio-title">
        <div className={styles.resultsHeading}>
          <div>
            <p className={styles.kicker}>Достижения и подтверждающие документы</p>
            <h2 id="portfolio-title">Портфолио</h2>
          </div>
          <details className={styles.uploadDetails}>
            <summary className={styles.primaryButton}>Добавить запись</summary>
            <PortfolioUploadForm isStaff={false} folders={folders} />
          </details>
        </div>

        <form action="/documents" className={styles.filters} role="search">
          <input name="tab" type="hidden" value="portfolio" />
          <input name="folder" type="hidden" value={folder || "all"} />
          <label className={styles.field}>
            <span>Поиск по названию</span>
            <input
              defaultValue={query}
              maxLength={100}
              name="q"
              placeholder="Например, олимпиада"
              type="search"
            />
          </label>
          <label className={styles.field}>
            <span>Категория</span>
            <select defaultValue={category} name="category">
              <option value="">Все категории</option>
              {Object.entries(portfolioCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Год</span>
            <select defaultValue={year} name="year">
              <option value="">Любой год</option>
              {availableYears.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">Применить</button>
        </form>

        {visibleItems.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>
              {items.length === 0
                ? "Пока нет достижений"
                : "Записи не найдены"}
            </h3>
            <p>
              Здесь будут ваши дипломы и сертификаты. Загружайте свои документы
              или дождитесь, когда деканат добавит достижения.
            </p>
          </div>
        ) : (
          <div className={styles.itemGrid}>
            {visibleItems.map((item) => (
              <article className={styles.itemCard} key={item.id}>
                <div className={styles.itemHeading}>
                  <div>
                    <span className={styles.categoryBadge}>
                      {portfolioCategoryLabels[item.category]}
                    </span>
                    <h3>{item.title}</h3>
                  </div>
                  <span
                    className={`${styles.sourceBadge} ${
                      item.source === "STAFF" ? styles.staffSource : ""
                    }`}
                  >
                    {item.source === "STAFF"
                      ? "Добавлено деканатом"
                      : "Добавлено вами"}
                  </span>
                </div>
                <dl className={styles.metadata}>
                  {item.eventName ? (
                    <>
                      <dt>Мероприятие</dt>
                      <dd>{item.eventName}</dd>
                    </>
                  ) : null}
                  {item.eventDate ? (
                    <>
                      <dt>Дата</dt>
                      <dd>{dateFormatter.format(item.eventDate)}</dd>
                    </>
                  ) : null}
                  {item.role ? (
                    <>
                      <dt>Роль</dt>
                      <dd>{item.role}</dd>
                    </>
                  ) : null}
                  <dt>Файл</dt>
                  <dd>{item.originalName} · {formatBytes(item.size)}</dd>
                </dl>
                {item.description ? (
                  <p className={styles.itemDescription}>{item.description}</p>
                ) : null}
                <div className={styles.itemLinks}>
                  <Link
                    className={styles.secondaryButton}
                    href={`/files/portfolio/${item.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Открыть
                  </Link>
                  <Link
                    className={styles.secondaryButton}
                    href={`/files/portfolio/${item.id}?download=1`}
                  >
                    Скачать
                  </Link>
                </div>
                <PortfolioItemControls
                  folders={folders}
                  isManager={false}
                  isStaff={false}
                  item={item}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
