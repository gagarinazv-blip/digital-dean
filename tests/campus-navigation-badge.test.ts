import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useStudentNotificationStoreMock } = vi.hoisted(() => ({
  useStudentNotificationStoreMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/notification-store", () => ({
  useStudentNotificationStore: useStudentNotificationStoreMock,
}));

import { CampusNavigation } from "../src/components/campus-navigation";

function renderNavigation(unreadCount: number) {
  useStudentNotificationStoreMock.mockReturnValue({ unreadCount });
  return renderToStaticMarkup(
    createElement(CampusNavigation, {
      studentId: 17,
      unreadNotificationCount: unreadCount,
    }),
  );
}

function getBadges(markup: string) {
  return [
    ...markup.matchAll(
      /<span aria-label="(Непрочитанных уведомлений: \d+)"[^>]*>([^<]*)<\/span>/g,
    ),
  ].map(([, label, text]) => ({ label, text }));
}

afterEach(() => vi.clearAllMocks());

describe("campus navigation unread badge", () => {
  it.each([
    [1, "1"],
    [5, "5"],
    [99, "99"],
    [100, "99+"],
    [1500, "99+"],
  ])("renders exactly one badge for %i unread", (count, text) => {
    const markup = renderNavigation(count);

    expect(getBadges(markup)).toEqual([
      { label: `Непрочитанных уведомлений: ${count}`, text },
    ]);
    // No other element repeats the number inside the menu.
    expect(
      markup.match(new RegExp(`>${text.replace("+", "\\+")}<`, "g")),
    ).toHaveLength(1);
  });

  it("renders no badge when everything is read", () => {
    const markup = renderNavigation(0);

    expect(getBadges(markup)).toEqual([]);
    expect(markup).not.toContain(">0<");
  });

  it("reads the value from the shared notification store", () => {
    renderNavigation(3);

    expect(useStudentNotificationStoreMock).toHaveBeenCalledExactlyOnceWith(
      17,
      3,
    );
  });
});
