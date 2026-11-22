// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/staff/students" }));

import { StaffNavigation } from "../src/components/staff-navigation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
const nav = () => container.querySelector<HTMLElement>("nav")!;
const toggle = () => container.querySelector<HTMLButtonElement>("button")!;

beforeEach(() => {
  // Cookie меню действует только внутри /staff.
  (
    window as unknown as { happyDOM: { setURL: (url: string) => void } }
  ).happyDOM.setURL("http://localhost:3000/staff/students");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("staff navigation", () => {
  it("collapses, expands, and remembers the choice", () => {
    act(() =>
      root.render(<StaffNavigation initiallyCollapsed={false} isManagerAccount />),
    );
    expect(nav().dataset.collapsed).toBe("false");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    act(() => toggle().click());
    expect(nav().dataset.collapsed).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Развернуть меню");
    expect(document.cookie).toContain("staff-sidebar=collapsed");

    act(() => toggle().click());
    expect(nav().dataset.collapsed).toBe("false");
    expect(document.cookie).toContain("staff-sidebar=expanded");
  });

  it("renders the saved state on the server and keeps link names", () => {
    const markup = renderToStaticMarkup(
      <StaffNavigation initiallyCollapsed isManagerAccount={false} />,
    );
    expect(markup).toContain('data-collapsed="true"');
    expect(markup).toContain('aria-label="Студенты"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain("Виды справок");
  });
});
