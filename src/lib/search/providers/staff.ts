import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/campus-labels";
import { getPrisma } from "@/lib/prisma";
import {
  getStaffRequestFilter,
} from "@/lib/permissions";
import {
  getPhoneSearchDigits,
  getSearchTermVariants,
  matchesSearchQuery,
  matchesStudentPhoneQuery,
  paginateResults,
  type SearchQuery,
} from "@/lib/search/query";
import { getRequestSearchTermConditions } from "@/lib/search/request-search";
import {
  portfolioCategories,
  portfolioCategoryLabels,
} from "@/lib/portfolio-constants";
import {
  eventStatusLabels,
  eventStatusValues,
  eventTypeLabels,
  eventTypeValues,
} from "@/lib/event-constants";
import { getDigestWeekKey } from "@/lib/event-digest";
import {
  formatMoscowTime,
  getMoscowCalendarWeek,
} from "@/lib/campus-time";
import { staffNavigationItems } from "@/lib/staff-navigation-items";
import type {
  SearchProvider,
  SearchProviderPage,
  SearchResult,
} from "@/lib/search/types";
import { getRequestCatalogTitle } from "@/lib/request-catalog";

function pageResults(results: SearchResult[], limit: number): SearchProviderPage {
  return paginateResults(results, limit);
}

const eventDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeZone: "Europe/Moscow",
});

function getStudentWhere(query: SearchQuery): Prisma.StudentWhereInput {
  return {
    AND: query.terms.map((term) => {
      const textValues = getSearchTermVariants(term);
      const phoneValue = getPhoneSearchDigits(term);
      return {
        OR: [
          ...textValues.map((value) => ({
            fullName: { contains: value, mode: "insensitive" as const },
          })),
          ...textValues.map((value) => ({
            group: {
              is: {
                name: { contains: value, mode: "insensitive" as const },
              },
            },
          })),
          ...(phoneValue
            ? [{ phone: { contains: phoneValue } }]
            : []),
        ],
      };
    }),
  };
}

export const staffSectionsProvider: SearchProvider = {
  id: "staff-sections",
  role: "STAFF",
  group: "Разделы Staff",
  async search(query, _user, limit) {
    const results = staffNavigationItems
      .map((item) => ({
        title: item.label,
        subtitle: item.description,
        href: item.href,
      }))
      .filter((section) =>
        matchesSearchQuery(query, section.title, section.subtitle),
      )
      .map((section) => ({
        id: `staff-section:${section.href}`,
        group: "Разделы Staff",
        title: section.title,
        subtitle: section.subtitle,
        href: section.href,
      }));
    return pageResults(results, limit);
  },
};

export const staffRequestsProvider: SearchProvider = {
  id: "staff-requests",
  role: "STAFF",
  group: "Заявки",
  async search(query, user, limit) {
    if (user.role !== "STAFF") return { results: [], hasMore: false };
    const prisma = getPrisma();
    const accessFilter = user.staff.isSupervisor
      ? null
      : getStaffRequestFilter(user.staff);
    const requests = await prisma.request.findMany({
      where: {
        AND: [
          ...(accessFilter ? [accessFilter] : []),
          ...query.terms.map((term) => ({
            OR: [
              ...getRequestSearchTermConditions(term),
              ...getSearchTermVariants(term).flatMap((value) => [
                {
                  student: {
                    is: {
                      fullName: {
                        contains: value,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
                {
                  student: {
                    is: {
                      group: {
                        is: {
                          name: {
                            contains: value,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                    },
                  },
                },
              ]),
            ],
          })),
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: Math.min(limit + 1, 1000),
      select: {
        id: true,
        publicId: true,
        type: true,
        catalogCode: true,
        status: true,
        comment: true,
        student: {
          select: {
            fullName: true,
            group: { select: { name: true } },
          },
        },
      },
    });
    const results = requests
      .filter((request) => {
        const serviceTitle = getRequestCatalogTitle(
          request.catalogCode,
          requestTypeLabels[request.type],
        );
        return matchesSearchQuery(
          query,
          request.publicId,
          request.comment,
          serviceTitle,
          requestStatusLabels[request.status],
          request.student.fullName,
          request.student.group.name,
        );
      })
      .map((request) => ({
        id: `staff-request:${request.id}`,
        group: "Заявки",
        title: getRequestCatalogTitle(
          request.catalogCode,
          requestTypeLabels[request.type],
        ),
        subtitle: `${request.student.fullName} · ${requestStatusLabels[request.status]} · № ${request.publicId.slice(0, 8).toUpperCase()}`,
        href: `/staff/requests/${request.id}`,
      }));
    return pageResults(results, limit);
  },
};

export const staffStudentsProvider: SearchProvider = {
  id: "staff-students",
  role: "STAFF",
  group: "Студенты",
  async search(query, user, limit) {
    if (user.role !== "STAFF") return { results: [], hasMore: false };
    const requestedCount = Math.min(limit + 1, 1000);
    const students = await getPrisma().student.findMany({
      where: getStudentWhere(query),
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: requestedCount,
      select: {
        id: true,
        fullName: true,
        phone: true,
        course: true,
        group: { select: { name: true } },
      },
    });
    const results = students
      .filter((student) =>
        matchesStudentPhoneQuery(
          query,
          [student.fullName, student.group.name, String(student.course)],
          student.phone,
        ),
      )
      .map((student) => ({
        id: `staff-student:${student.id}`,
        group: "Студенты",
        title: student.fullName,
        subtitle: [
          `${student.group.name} · ${student.course} курс`,
          student.phone,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/staff/students/${student.id}`,
      }));
    return pageResults(results, limit);
  },
};

export const staffPortfolioProvider: SearchProvider = {
  id: "staff-portfolio",
  role: "STAFF",
  group: "Достижения студентов",
  async search(query, user, limit) {
    if (user.role !== "STAFF") return { results: [], hasMore: false };
    const items = await getPrisma().portfolioItem.findMany({
      where: {
        AND: query.terms.map((term) => {
          const variants = getSearchTermVariants(term);
          const matchingCategories = portfolioCategories.filter((category) =>
            getSearchTermVariants(
              portfolioCategoryLabels[category].toLocaleLowerCase("ru-RU"),
            ).some((value) => value.includes(term)),
          );
          return {
            OR: [
              ...variants.flatMap((value) => [
                { title: { contains: value, mode: "insensitive" as const } },
                { eventName: { contains: value, mode: "insensitive" as const } },
                { role: { contains: value, mode: "insensitive" as const } },
                {
                  student: {
                    is: {
                      fullName: { contains: value, mode: "insensitive" as const },
                    },
                  },
                },
                {
                  student: {
                    is: {
                      group: {
                        is: {
                          name: { contains: value, mode: "insensitive" as const },
                        },
                      },
                    },
                  },
                },
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
        role: true,
        source: true,
        student: {
          select: {
            id: true,
            fullName: true,
            group: { select: { name: true } },
          },
        },
      },
    });
    const results = items
      .filter((item) =>
        matchesSearchQuery(
          query,
          item.title,
          portfolioCategoryLabels[item.category],
          item.eventName,
          item.role,
          item.student.fullName,
          item.student.group.name,
        ),
      )
      .map((item) => ({
        id: `staff-portfolio:${item.id}`,
        group: "Достижения студентов",
        title: item.title,
        subtitle: [
          item.student.fullName,
          item.student.group.name,
          portfolioCategoryLabels[item.category],
          item.source === "STAFF" ? "Добавлено деканатом" : "Добавлено студентом",
        ].join(" · "),
        href: `/staff/achievements?q=${encodeURIComponent(item.title)}`,
      }));
    return pageResults(results, limit);
  },
};

export const staffEventsProvider: SearchProvider = {
  id: "staff-events",
  role: "STAFF",
  group: "Дайджест событий",
  async search(query, _user, limit) {
    const events = await getPrisma().event.findMany({
      where: {
        AND: query.terms.map((term) => {
          const matchingTypes = eventTypeValues.filter((type) =>
            getSearchTermVariants(
              eventTypeLabels[type].toLocaleLowerCase("ru-RU"),
            ).some((value) => value.includes(term)),
          );
          const matchingStatuses = eventStatusValues.filter((status) =>
            getSearchTermVariants(
              eventStatusLabels[status].toLocaleLowerCase("ru-RU"),
            ).some((value) => value.includes(term)),
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
              ...(matchingStatuses.length
                ? [{ status: { in: matchingStatuses } }]
                : []),
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
        status: true,
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
          eventStatusLabels[event.status],
        ),
      )
      .map((event) => ({
        id: `staff-event:${event.id}`,
        group: "Дайджест событий",
        title: event.title,
        subtitle: `${eventStatusLabels[event.status]} · ${eventTypeLabels[event.type]} · ${event.location} · ${event.host} · ${eventDateFormatter.format(event.startsAt)} ${formatMoscowTime(event.startsAt)}`,
        href: `/staff/events?week=${getDigestWeekKey(getMoscowCalendarWeek(event.startsAt))}`,
      }));
    return pageResults(results, limit);
  },
};

export const staffSearchProviders: readonly SearchProvider[] = [
  staffSectionsProvider,
  staffRequestsProvider,
  staffStudentsProvider,
  staffPortfolioProvider,
  staffEventsProvider,
];
