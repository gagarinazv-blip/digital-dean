export const documentSectionItems = [
  {
    key: "catalog",
    href: "/documents?tab=catalog",
    label: "Запросить справку",
  },
  {
    key: "requests",
    href: "/requests?tab=requests",
    label: "Мои заявки",
  },
  {
    key: "ready",
    href: "/documents?tab=documents",
    label: "Готовые документы",
  },
  {
    key: "mine",
    href: "/documents/mine",
    label: "Мои документы",
  },
] as const;

export type DocumentSectionKey =
  (typeof documentSectionItems)[number]["key"];

export function getActiveDocumentSection(
  pathname: string,
  tab: string | null,
): DocumentSectionKey {
  if (pathname === "/requests" || pathname.startsWith("/requests/")) {
    return "requests";
  }
  if (pathname === "/documents/mine" || pathname.startsWith("/documents/mine/")) {
    return "mine";
  }
  if (pathname === "/documents/ready" || pathname.startsWith("/documents/ready/")) {
    return "ready";
  }
  if (pathname === "/documents" || pathname === "/help") {
    return tab === "documents" ? "ready" : "catalog";
  }
  return "catalog";
}
