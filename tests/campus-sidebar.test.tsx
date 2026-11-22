// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/deadlines/d1" }));
vi.mock("@/lib/notification-store", () => ({
  useStudentNotificationStore: () => ({ unreadCount: 3 }),
}));

import { CampusNavigation } from "../src/components/campus-navigation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const nav = () => container.querySelector<HTMLElement>("nav")!;
const toggle = () => nav().querySelector<HTMLButtonElement>("button")!;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("campus navigation", () => {
  it("collapses, expands, and remembers the choice", () => {
    act(() => root.render(<CampusNavigation studentId={1} unreadNotificationCount={3} />));
    expect(nav().dataset.collapsed).toBe("false");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    act(() => toggle().click());
    expect(nav().dataset.collapsed).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Развернуть меню");
    expect(document.cookie).toContain("campus-sidebar=collapsed");

    act(() => toggle().click());
    expect(nav().dataset.collapsed).toBe("false");
    expect(document.cookie).toContain("campus-sidebar=expanded");
  });

  it("renders the saved state on the server and keeps link names", () => {
    const markup = renderToStaticMarkup(
      <CampusNavigation initiallyCollapsed studentId={1} unreadNotificationCount={3} />,
    );
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain("Расписание");
    expect(markup).toMatch(/aria-current="page"[^>]*href="\/deadlines"/);
  });
});
