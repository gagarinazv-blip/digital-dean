// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PasswordInput } from "../src/components/password-input";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("password input", () => {
  it("toggles visibility with an icon button and keeps the value", () => {
    act(() => root.render(<PasswordInput defaultValue="secret" name="password" />));
    const input = container.querySelector("input")!;
    const button = container.querySelector("button")!;
    expect(input.type).toBe("password");
    expect(button.type).toBe("button");
    expect(button.textContent).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Показать пароль");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    act(() => button.click());
    expect(input.type).toBe("text");
    expect(input.value).toBe("secret");
    expect(button.getAttribute("aria-pressed")).toBe("true");

    act(() => button.click());
    expect(input.type).toBe("password");
  });
});
