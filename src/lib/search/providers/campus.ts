import "server-only";

import {
  controlTypeLabels,
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/campus-labels";
import { campusNavigationItems } from "@/lib/campus-navigation-items";
import { getAcademicRecords } from "@/lib/academic-records";
import { eventTypeLabels, eventTypeValues } from "@/lib/event-constants";
import { getDigestWeekKey } from "@/lib/event-digest";
import { getPrisma } from "@/lib/prisma";
import { getMoscowCalendarWeek, formatMoscowTime } from "@/lib/campus-time";
import {
  portfolioCategories,
  portfolioCategoryLabels,
} from "@/lib/portfolio-constants";
import {
  getRequestCatalogTitle,
  requestCatalog,
} from "@/lib/request-catalog";
import { getRequestSearchTermConditions } from "@/lib/search/request-search";
import {
  getPhoneSearchDigits,
  getSearchTermVariants,
  matchesSearchQuery,
  normalizeSearchText,
  paginateResults,
} from "@/lib/search/query";
import type {
  SearchProvider,
  SearchProviderPage,
  SearchResult,
} from "@/lib/search/types";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeZone: "Europe/Moscow",
});

function mapPage(
  records: SearchResult[],
  limit: number,
): SearchProviderPage {
  return paginateResults(records, limit);
}

export const studentSectionsProvider: SearchProvider = {
  id: "student-sections",
  role: "STUDENT",
  group: "Разделы",
  async search(query, _user, limit) {
    const results = [
      ...campusNavigationItems.map((item) => ({
        title: item.label,
        subtitle: item.description,
        href: item.href,
      })),
      {
        title: "Дедлайны",
        subtitle: "Учебные сроки и задания",
        href: "/deadlines",
      },
    ]
      .filter((section) =>
        matchesSearchQuery(query, section.title, section.subtitle),
      )
      .map((section) => ({
        id: `section:${section.href}`,
        group: "Разделы",
        title: section.title,
        subtitle: section.subtitle,
        href: section.href,
      }));
    return mapPage(results, limit);
  },
};

export const studentCatalogProvider: SearchProvider = {
  id: "student-service-catalog",
  role: "STUDENT",
  group: "Каталог услуг",
  async search(query, _user, limit) {
    const results = requestCatalog
      .filter(
        (service) =>
          service.active &&
          matchesSearchQuery(
            query,
            service.title,
            service.description,
            ...service.fields.map((field) => field.label),
          ),
      )
      .map((service) => ({
        id: `service:${service.code}`,
        group: "Каталог услуг",
        title: service.title,
        subtitle: service.description,
        href: `/requests/new?service=${encodeURIComponent(service.code)}`,
      }));
    return mapPage(results, limit);
  },
};

export const studentRequestsProvider: SearchProvider = {
  id: "student-requests",
  role: "STUDENT",
  group: "Мои заявки",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const take = Math.min(limit + 1, 1000);
    const requests = await getPrisma().request.findMany({
      where: {
        studentId: user.student.id,
        AND: query.terms.map((term) => ({
          OR: getRequestSearchTermConditions(term),
        })),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      select: {
        publicId: true,
        type: true,
        catalogCode: true,
        status: true,
        comment: true,
        createdAt: true,
      },
    });
    const results = requests
      .filter((request) =>
        matchesSearchQuery(
          query,
          getRequestCatalogTitle(
            request.catalogCode,
            requestTypeLabels[request.type],
          ),
          request.publicId,
          request.comment,
          requestStatusLabels[request.status],
        ),
      )
      .map((request) => {
        const title = getRequestCatalogTitle(
          request.catalogCode,
          requestTypeLabels[request.type],
        );
        return {
          id: `request:${request.publicId}`,
          group: "Мои заявки",
          title,
          subtitle: `№ ${request.publicId.slice(0, 8).toUpperCase()} · ${requestStatusLabels[request.status]} · ${dateFormatter.format(request.createdAt)}`,
          href: `/requests/${request.publicId}`,
        };
      });
    return mapPage(results, limit);
  },
};

export const studentDocumentsProvider: SearchProvider = {
  id: "student-documents",
  role: "STUDENT",
  group: "Мои документы",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const take = Math.min(limit + 1, 1000);
    const documents = await getPrisma().requestAttachment.findMany({
      where: {
        kind: "RESULT",
        comment: {
          is: {
            visibility: "PUBLIC",
            request: {
              is: { studentId: user.student.id, status: "READY" },
            },
          },
        },
        AND: query.terms.map((term) => {
          const variants = getSearchTermVariants(term);
          const matchingCatalogCodes = requestCatalog
            .filter(
              (service) =>
                service.active &&
                [
                  service.title,
                  service.description,
                  ...service.fields.map((field) => field.label),
                ].some((value) =>
                  normalizeSearchText(value).includes(term),
                ),
            )
            .map((service) => service.code);
          return {
            OR: [
              ...variants.map((value) => ({
                fileName: { contains: value, mode: "insensitive" as const },
              })),
              ...variants.map((value) => ({
                comment: {
                  is: {
                    request: {
                      is: {
                        publicId: {
                          contains: value,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  },
                },
              })),
              ...(matchingCatalogCodes.length
                ? [
                    {
                      comment: {
                        is: {
                          request: {
                            is: { catalogCode: { in: matchingCatalogCodes } },
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          };
        }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        fileName: true,
        comment: {
          select: {
            request: {
              select: {
                publicId: true,
                type: true,
                catalogCode: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    const results = documents
      .filter(({ fileName, comment }) => {
        const request = comment.request;
        return matchesSearchQuery(
          query,
          fileName,
          getRequestCatalogTitle(
            request.catalogCode,
            requestTypeLabels[request.type],
          ),
          request.publicId,
        );
      })
      .map(({ id, fileName, comment }) => {
        const request = comment.request;
        return {
          id: `document:${id}`,
          group: "Мои документы",
          title: fileName,
          subtitle: `${getRequestCatalogTitle(
            request.catalogCode,
            requestTypeLabels[request.type],
          )} · ${dateFormatter.format(request.updatedAt)}`,
          href: `/requests/${request.publicId}`,
        };
      });
    return mapPage(results, limit);
  },
};

export const studentPortfolioProvider: SearchProvider = {
  id: "student-portfolio",
  role: "STUDENT",
  group: "Портфолио",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const items = await getPrisma().portfolioItem.findMany({
      where: {
        studentId: user.student.id,
        AND: query.terms.map((term) => {
          const matchingCategories = portfolioCategories.filter((category) =>
            normalizeSearchText(portfolioCategoryLabels[category]).includes(
              term,
            ),
          );
          return {
            OR: [
              ...getSearchTermVariants(term).flatMap((value) => [
                { title: { contains: value, mode: "insensitive" as const } },
                { eventName: { contains: value, mode: "insensitive" as const } },
                { role: { contains: value, mode: "insensitive" as const } },
              ]),
              ...(matchingCategories.length
                ? [{ category: { in: matchingCategories } }]
                : []),
            ],
          };
        }),
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: Math.min(limit + 1, 1000),
      select: {
        id: true,
        title: true,
        category: true,
        eventName: true,
        eventDate: true,
        role: true,
      },
    });
    const results = items
      .filter((item) =>
        matchesSearchQuery(
          query,
          item.title,
          item.eventName,
          portfolioCategoryLabels[item.category],
          item.role,
        ),
      )
      .map((item) => ({
        id: `portfolio:${item.id}`,
        group: "Портфолио",
        title: item.title,
        subtitle: [
          portfolioCategoryLabels[item.category],
          item.eventName,
          item.eventDate ? dateFormatter.format(item.eventDate) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/help?tab=portfolio&q=${encodeURIComponent(item.title)}`,
      }));
    return mapPage(results, limit);
  },
};

export const studentEventsProvider: SearchProvider = {
  id: "student-events",
  role: "STUDENT",
  group: "Дайджест событий",
  async search(query, _user, limit) {
    const events = await getPrisma().event.findMany({
      where: {
        status: "PUBLISHED",
        AND: query.terms.map((term) => {
          const matchingTypes = eventTypeValues.filter((type) =>
            normalizeSearchText(eventTypeLabels[type]).includes(term),
          );
          return {
            OR: [
              ...getSearchTermVariants(term).flatMap((value) => [
                { title: { contains: value, mode: "insensitive" as const } },
                { description: { contains: value, mode: "insensitive" as const } },
                { location: { contains: value, mode: "insensitive" as const } },
                { host: { contains: value, mode: "insensitive" as const } },
              ]),
              ...(matchingTypes.length ? [{ type: { in: matchingTypes } }] : []),
            ],
          };
        }),
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: Math.min(limit + 1, 1000),
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        startsAt: true,
        location: true,
        host: true,
      },
    });
    const results = events
      .filter((event) =>
        matchesSearchQuery(
          query,
          event.title,
          eventTypeLabels[event.type],
          event.description,
          event.location,
          event.host,
        ),
      )
      .map((event) => ({
        id: `event:${event.id}`,
        group: "Дайджест событий",
        title: event.title,
        subtitle: `${eventTypeLabels[event.type]} · ${event.location} · ${event.host} · ${dateFormatter.format(event.startsAt)} ${formatMoscowTime(event.startsAt)}`,
        href: `/digest?week=${getDigestWeekKey(getMoscowCalendarWeek(event.startsAt))}`,
      }));
    return mapPage(results, limit);
  },
};

export const studentNotificationsProvider: SearchProvider = {
  id: "student-notifications",
  role: "STUDENT",
  group: "Уведомления",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const take = Math.min(limit + 1, 1000);
    const notifications = await getPrisma().notification.findMany({
      where: {
        OR: [
          { studentId: user.student.id },
          { studentId: null, groupId: user.student.group.id },
          { studentId: null, groupId: null },
        ],
        AND: query.terms.map((term) => ({
          OR: getSearchTermVariants(term).flatMap((value) => [
            { title: { contains: value, mode: "insensitive" as const } },
            { text: { contains: value, mode: "insensitive" as const } },
          ]),
        })),
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take,
      select: {
        publicId: true,
        title: true,
        text: true,
        date: true,
        studentId: true,
      },
    });
    const results = notifications
      .filter((notification) =>
        matchesSearchQuery(query, notification.title, notification.text),
      )
      .map((notification) => ({
        id: `notification:${notification.publicId}`,
        group: "Уведомления",
        title: notification.title,
        subtitle: dateFormatter.format(notification.date),
        href: notification.studentId
          ? `/notifications/${notification.publicId}`
          : "/notifications",
      }));
    return mapPage(results, limit);
  },
};

export const studentScheduleProvider: SearchProvider = {
  id: "student-schedule",
  role: "STUDENT",
  group: "Расписание",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const take = Math.min(limit + 1, 1000);
    const lessons = await getPrisma().scheduleItem.findMany({
      where: {
        groupId: user.student.group.id,
        AND: query.terms.map((term) => ({
          OR: [
            ...getSearchTermVariants(term).flatMap((value) => [
              {
                subject: {
                  is: {
                    name: { contains: value, mode: "insensitive" as const },
                  },
                },
              },
              { teacher: { contains: value, mode: "insensitive" as const } },
              { room: { contains: value, mode: "insensitive" as const } },
              {
                changeNote: {
                  contains: value,
                  mode: "insensitive" as const,
                },
              },
            ]),
          ],
        })),
      },
      orderBy: [{ startsAt: "asc" }, { date: "asc" }, { id: "asc" }],
      take,
      select: {
        id: true,
        date: true,
        weekday: true,
        startsAt: true,
        room: true,
        teacher: true,
        changeNote: true,
        subject: { select: { name: true } },
      },
    });
    const results = lessons
      .filter((lesson) =>
        matchesSearchQuery(
          query,
          lesson.subject.name,
          lesson.teacher,
          lesson.room,
          lesson.changeNote,
          lesson.weekday,
        ),
      )
      .map((lesson) => ({
        id: `lesson:${lesson.id}`,
        group: "Расписание",
        title: lesson.subject.name,
        subtitle: [
          lesson.date ? dateFormatter.format(lesson.date) : lesson.weekday,
          lesson.teacher,
          lesson.room,
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/schedule",
      }));
    return mapPage(results, limit);
  },
};

export const studentDeadlinesProvider: SearchProvider = {
  id: "student-deadlines",
  role: "STUDENT",
  group: "Дедлайны",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const take = Math.min(limit + 1, 1000);
    const deadlines = await getPrisma().deadline.findMany({
      where: {
        studentId: user.student.id,
        AND: query.terms.map((term) => ({
          OR: getSearchTermVariants(term).flatMap((value) => [
            { subject: { contains: value, mode: "insensitive" as const } },
            { title: { contains: value, mode: "insensitive" as const } },
            {
              description: {
                contains: value,
                mode: "insensitive" as const,
              },
            },
          ]),
        })),
      },
      orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      take,
      select: {
        id: true,
        subject: true,
        title: true,
        description: true,
        dueAt: true,
        status: true,
      },
    });
    const results = deadlines
      .filter((deadline) =>
        matchesSearchQuery(
          query,
          deadline.subject,
          deadline.title,
          deadline.description,
          deadline.status,
        ),
      )
      .map((deadline) => ({
        id: `deadline:${deadline.id}`,
        group: "Дедлайны",
        title: deadline.title,
        subtitle: `${deadline.subject} · ${dateFormatter.format(deadline.dueAt)}`,
        href: "/deadlines",
      }));
    return mapPage(results, limit);
  },
};

export const studentGradesProvider: SearchProvider = {
  id: "student-grades",
  role: "STUDENT",
  group: "Успеваемость",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const { dataset } = await getAcademicRecords();
    const results =
      dataset?.semesters.flatMap((semester) =>
        semester.planItems
          .filter((item) =>
            matchesSearchQuery(
              query,
              item.name,
              item.department,
              item.teacher,
              semester.name,
              controlTypeLabels[item.controlType],
              item.result?.value,
              item.result?.status,
            ),
          )
          .map((item) => ({
            id: `grade:${semester.id}:${item.id}`,
            group: "Успеваемость",
            title: item.name,
            subtitle: `${semester.name} · ${item.result?.value ?? "Оценка не выставлена"}`,
            href: `/grades/${item.id}`,
          })),
      ) ?? [];
    return mapPage(results, limit);
  },
};

export const studentProfileProvider: SearchProvider = {
  id: "student-profile",
  role: "STUDENT",
  group: "Профиль",
  async search(query, user, limit) {
    if (user.role !== "STUDENT") return { results: [], hasMore: false };
    const profile = await getPrisma().student.findUnique({
      where: {
        id: user.student.id,
        AND: query.terms.map((term) => ({
          OR: [
            ...getSearchTermVariants(term).flatMap((value) => [
              { fullName: { contains: value, mode: "insensitive" as const } },
              { faculty: { contains: value, mode: "insensitive" as const } },
              { direction: { contains: value, mode: "insensitive" as const } },
              {
                group: {
                  is: {
                    name: { contains: value, mode: "insensitive" as const },
                  },
                },
              },
            ]),
            ...(getPhoneSearchDigits(term)
              ? [{ phone: { contains: getPhoneSearchDigits(term) } }]
              : []),
          ],
        })),
      },
      select: {
        fullName: true,
        faculty: true,
        direction: true,
        course: true,
        phone: true,
        group: { select: { name: true } },
      },
    });
    if (
      !profile ||
      !matchesSearchQuery(
        query,
        profile.fullName,
        profile.faculty,
        profile.direction,
        profile.group.name,
        String(profile.course),
        profile.phone,
      )
    ) {
      return { results: [], hasMore: false };
    }
    return mapPage(
      [
        {
          id: `profile:${user.student.id}`,
          group: "Профиль",
          title: profile.fullName,
          subtitle: `${profile.group.name} · ${profile.course} курс`,
          href: "/profile",
        },
      ],
      limit,
    );
  },
};

export const campusSearchProviders: readonly SearchProvider[] = [
  studentSectionsProvider,
  studentCatalogProvider,
  studentRequestsProvider,
  studentDocumentsProvider,
  studentPortfolioProvider,
  studentEventsProvider,
  studentNotificationsProvider,
  studentScheduleProvider,
  studentDeadlinesProvider,
  studentGradesProvider,
  studentProfileProvider,
];
