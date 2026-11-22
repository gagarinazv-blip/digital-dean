import Link from "next/link";
import { PortfolioItemControls } from "@/app/(campus)/documents/portfolio-controls";
import { PortfolioItemDrawer } from "@/app/(campus)/documents/portfolio-item-drawer";
import { DateTimeStack } from "@/components/date-time-stack";
import { requireStaffContext } from "@/lib/staff";
import { getPrisma } from "@/lib/prisma";
import { getStaffPortfolioItems } from "@/lib/portfolio";
import {
  portfolioCategoryLabels,
  portfolioCategories,
} from "@/lib/portfolio-constants";
import { isPortfolioCategory } from "@/lib/portfolio-form";
import styles from "./achievements.module.css";

const pageSize = 25;

function getSingleParam(
  value: string | string[] | undefined,
): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value: string, min: number, max: number): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}

function getPageHref(
  page: number,
  query: URLSearchParams,
): string {
  const next = new URLSearchParams(query);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return `/staff/achievements?${next.toString()}`;
}

export const instant = false;

export default async function StaffAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staffContext = await requireStaffContext();
  const query = await searchParams;
  const search = getSingleParam(query.q).slice(0, 120);
  const rawCategory = getSingleParam(query.category);
  const category = isPortfolioCategory(rawCategory) ? rawCategory : undefined;
  const rawSource = getSingleParam(query.source);
  const source =
    rawSource === "STUDENT" || rawSource === "STAFF" ? rawSource : undefined;
  const year = parseInteger(getSingleParam(query.year), 1900, 2100);
  const course = parseInteger(getSingleParam(query.course), 1, 6);
  const groupId = parseInteger(getSingleParam(query.groupId), 1, Number.MAX_SAFE_INTEGER);
  const requestedPage = parseInteger(getSingleParam(query.page), 1, 100000) ?? 1;
  const rawStudentId = parseInteger(
    getSingleParam(query.studentId),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const studentSearch = getSingleParam(query.studentQ).slice(0, 100);
  const studentSearchDigits = studentSearch.replace(/\D/g, "");

  let results = await getStaffPortfolioItems({
    query: search,
    category,
    source,
    year,
    course,
    groupId,
    page: requestedPage,
    pageSize,
  });
  const [groups, selectedStudent, studentMatches] = await Promise.all([
    getPrisma().studentGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    rawStudentId
      ? getPrisma().student.findUnique({
          where: { id: rawStudentId },
          select: { id: true, fullName: true, course: true, group: { select: { name: true } } },
        })
      : Promise.resolve(null),
    studentSearch.length >= 2
      ? getPrisma().student.findMany({
          where: {
            OR: [
              { fullName: { contains: studentSearch, mode: "insensitive" } },
              ...(studentSearchDigits.length >= 3
                ? [{ phone: { contains: studentSearchDigits } }]
                : []),
            ],
          },
          orderBy: { fullName: "asc" },
          take: 10,
          select: {
            id: true,
            fullName: true,
            course: true,
            group: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);
  const totalPages = Math.max(1, Math.ceil(results.total / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  if (results.total > 0 && currentPage !== requestedPage) {
    results = await getStaffPortfolioItems({
      query: search,
      category,
      source,
      year,
      course,
      groupId,
      page: currentPage,
      pageSize,
    });
  }
  const pageQuery = new URLSearchParams();
  if (search) pageQuery.set("q", search);
  if (category) pageQuery.set("category", category);
  if (source) pageQuery.set("source", source);
  if (year) pageQuery.set("year", String(year));
  if (course) pageQuery.set("course", String(course));
  if (groupId) pageQuery.set("groupId", String(groupId));

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p>Рабочее место · Портфолио студентов</p>
          <h1>Достижения</h1>
          <span>Записи, документы и подтверждения достижений студентов.</span>
        </div>
        <a className={styles.primaryButton} href="#add-achievement">
          Добавить достижение
        </a>
      </header>

      <section className={styles.addPanel} id="add-achievement" aria-labelledby="add-title">
        <h2 id="add-title">Добавить достижение</h2>
        {!selectedStudent ? (
          <>
            <form className={styles.studentSearch} method="get">
              <label>
                <span>Найдите студента по ФИО или номеру телефона</span>
                <input
                  autoComplete="off"
                  name="studentQ"
                  placeholder="Например, Анна Иванова или +7 900…"
                  defaultValue={studentSearch}
                />
              </label>
              <button className={styles.secondaryButton} type="submit">
                Найти студента
              </button>
            </form>
            {studentSearch.length >= 2 ? (
              studentMatches.length > 0 ? (
                <ul className={styles.studentMatches}>
                  {studentMatches.map((student) => {
                    const params = new URLSearchParams();
                    params.set("studentId", String(student.id));
                    params.set("studentQ", studentSearch);
                    return (
                      <li key={student.id}>
                        <Link href={`/staff/achievements?${params.toString()}`}>
                          <strong>{student.fullName}</strong>
                          <span>{student.course} курс · {student.group.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.emptyState}>Студенты не найдены.</p>
              )
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.selectedStudent}>
              Выбран студент: <strong>{selectedStudent.fullName}</strong>
              {" · "}{selectedStudent.course} курс · {selectedStudent.group.name}
              {" · "}
              <Link href="/staff/achievements">Изменить выбор</Link>
            </p>
            <PortfolioItemDrawer
              isStaff
              studentId={selectedStudent.id}
              studentName={selectedStudent.fullName}
              triggerLabel="Добавить достижение"
            />
          </>
        )}
      </section>

      <section className={styles.listPanel} aria-labelledby="list-title">
        <div className={styles.listHeading}>
          <div>
            <h2 id="list-title">Все достижения</h2>
            <p>{results.total} записей</p>
          </div>
        </div>
        <form action="/staff/achievements" className={styles.filters}>
          <label>
            <span>Поиск: ФИО или название</span>
            <input defaultValue={search} maxLength={120} name="q" />
          </label>
          <label>
            <span>Категория</span>
            <select defaultValue={category ?? ""} name="category">
              <option value="">Все категории</option>
              {portfolioCategories.map((value) => (
                <option key={value} value={value}>{portfolioCategoryLabels[value]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Источник</span>
            <select defaultValue={source ?? ""} name="source">
              <option value="">Все источники</option>
              <option value="STUDENT">Студент</option>
              <option value="STAFF">Деканат</option>
            </select>
          </label>
          <label>
            <span>Год</span>
            <input defaultValue={year} max="2100" min="1900" name="year" type="number" />
          </label>
          <label>
            <span>Курс</span>
            <select defaultValue={course ?? ""} name="course">
              <option value="">Все курсы</option>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>{value} курс</option>
              ))}
            </select>
          </label>
          <label>
            <span>Группа</span>
            <select defaultValue={groupId ?? ""} name="groupId">
              <option value="">Все группы</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">Применить</button>
        </form>

        {results.items.length === 0 ? (
          <p className={styles.emptyState}>Записей по выбранным параметрам нет.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Студент</th>
                  <th scope="col">Достижение</th>
                  <th scope="col">Категория</th>
                  <th scope="col">Мероприятие / дата</th>
                  <th scope="col">Источник</th>
                  <th scope="col">Кем добавлено</th>
                  <th scope="col">Действия</th>
                </tr>
              </thead>
              <tbody>
                {results.items.map((item) => {
                  const uploadedBy =
                    item.uploadedBy.staffProfile?.fullName ??
                    item.uploadedBy.student?.fullName ??
                    item.uploadedBy.login;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link href={`/staff/students/${item.studentId}`}>
                          {item.student.fullName}
                        </Link>
                        <small>{item.student.course} курс · {item.student.group.name}</small>
                      </td>
                      <td>
                        <strong>{item.title}</strong>
                        <small>
                          <Link href={`/files/portfolio/${item.id}`}>Открыть файл</Link>
                          {" · "}
                          <Link href={`/files/portfolio/${item.id}?download=1`}>Скачать</Link>
                        </small>
                      </td>
                      <td>{portfolioCategoryLabels[item.category]}</td>
                      <td>
                        {item.eventName ?? "—"}
                        {item.eventDate ? (
                          <DateTimeStack allDay value={item.eventDate} />
                        ) : null}
                      </td>
                      <td>{item.source === "STAFF" ? "Деканат" : "Студент"}</td>
                      <td>{uploadedBy}</td>
                      <td>
                        {item.source === "STAFF" || staffContext.isManagerAccount ? (
                          <PortfolioItemControls
                            folders={[]}
                            isManager={staffContext.isManagerAccount}
                            isStaff
                            item={item}
                          />
                        ) : (
                          <span>Только просмотр</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Страницы достижений">
            {currentPage > 1 ? (
              <Link href={getPageHref(currentPage - 1, pageQuery)}>Назад</Link>
            ) : <span aria-disabled="true">Назад</span>}
            <span>Страница {currentPage} из {totalPages}</span>
            {currentPage < totalPages ? (
              <Link href={getPageHref(currentPage + 1, pageQuery)}>Далее</Link>
            ) : <span aria-disabled="true">Далее</span>}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
