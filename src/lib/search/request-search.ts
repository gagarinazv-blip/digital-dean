import type { RequestStatus, RequestType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  requestStatusLabels,
  requestTypeLabels,
} from "@/lib/campus-labels";
import {
  normalizeSearchText,
  getSearchTermVariants,
} from "@/lib/search/query";
import { requestCatalog } from "@/lib/request-catalog";

export function getRequestSearchTermConditions(
  term: string,
): Prisma.RequestWhereInput[] {
  const variants = getSearchTermVariants(term);
  const matchingCatalogCodes = requestCatalog
    .filter(
      (service) =>
        service.active &&
        [
          service.title,
          service.description,
          ...service.fields.map((field) => field.label),
        ].some((value) => normalizeSearchText(value).includes(term)),
    )
    .map((service) => service.code);
  const matchingStatuses = (Object.keys(requestStatusLabels) as RequestStatus[])
    .filter((status) =>
      [status, requestStatusLabels[status]].some((value) =>
        normalizeSearchText(value).includes(term),
      ),
    );
  const matchingTypes = (Object.keys(requestTypeLabels) as RequestType[])
    .filter((type) =>
      [type, requestTypeLabels[type]].some((value) =>
        normalizeSearchText(value).includes(term),
      ),
    );

  return [
    ...variants.map((value) => ({
      publicId: { contains: value, mode: "insensitive" as const },
    })),
    ...variants.map((value) => ({
      comment: { contains: value, mode: "insensitive" as const },
    })),
    ...(matchingCatalogCodes.length
      ? [{ catalogCode: { in: matchingCatalogCodes } }]
      : []),
    ...(matchingStatuses.length
      ? [{ status: { in: matchingStatuses } }]
      : []),
    ...(matchingTypes.length ? [{ type: { in: matchingTypes } }] : []),
  ];
}
