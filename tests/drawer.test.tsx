// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "../src/components/ui/drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

function Example({ initiallyDirty = false, isBusy = false }) {
  const [open, setOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(initiallyDirty);
  return (
    <>
      <button id="trigger" onClick={() => setOpen(true)} type="button">
        Открыть
      </button>
      <Drawer
        footer={<button type="button">Сохранить</button>}
        id="drawer"
        isBusy={isBusy}
        isDirty={isDirty}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        open={open}
        title="Заголовок окна"
      >
        <input data-autofocus="" id="field" onChange={() => setIsDirty(true)} />
        <input id="file" type="file" />
      </Drawer>
    </>
  );
}

const get = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const drawer = () => get<HTMLDialogElement>("#drawer");
const confirmation = () => get<HTMLDialogElement>("#drawer dialog");
const buttonByText = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === text,
  )!;

function fire(element: Element, event: Event) {
  act(() => {
    element.dispatchEvent(event);
  });
}

function click(element: Element) {
  fire(element, new MouseEvent("click", { bubbles: true }));
}

function pressEscape(element: Element = drawer()) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  fire(element, event);
  return event;
}

function clickBackdrop(pressedOn: Element = drawer()) {
  fire(pressedOn, new MouseEvent("mousedown", { bubbles: true }));
  click(drawer());
}

function open(props: { initiallyDirty?: boolean; isBusy?: boolean } = {}) {
  act(() => root.render(<Example {...props} />));
  get("#trigger").focus();
  click(get("#trigger"));
}

beforeEach(() => {
  onClose.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Drawer", () => {
  it("opens as a labelled modal dialog and moves focus inside", () => {
    open();
    expect(drawer().open).toBe(true);
    expect(drawer().getAttribute("role")).toBe("dialog");
    expect(drawer().getAttribute("aria-modal")).toBe("true");
    const label = document.getElementById(
      drawer().getAttribute("aria-labelledby")!,
    );
    expect(label?.textContent).toBe("Заголовок окна");
    expect(document.activeElement).toBe(get("#field"));
  });

  it.each([
    ["the close button", () => click(get('[aria-label="Закрыть"]'))],
    ["Escape", () => void pressEscape()],
    ["a backdrop click", () => clickBackdrop()],
  ])("closes with %s and returns focus to the trigger", (_name, close) => {
    open();
    close();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(drawer().open).toBe(false);
    expect(document.activeElement).toBe(get("#trigger"));
  });

  it("ignores clicks inside and a drag released on the backdrop", () => {
    open();
    click(get("#field"));
    clickBackdrop(get("#field"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores the cancel event of a file picker", () => {
    open();
    fire(get("#file"), new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the dialog", () => {
    open();
    const last = buttonByText("Сохранить");
    last.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    fire(last, event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(get('[aria-label="Закрыть"]'));
  });

  it.each([
    ["the close button", () => click(get('[aria-label="Закрыть"]'))],
    ["Escape", () => void pressEscape()],
    ["a backdrop click", () => clickBackdrop()],
  ])("asks before losing changes on %s", (_name, close) => {
    open({ initiallyDirty: true });
    close();
    expect(onClose).not.toHaveBeenCalled();
    expect(confirmation().open).toBe(true);
    expect(confirmation().textContent).toContain("Закрыть без сохранения?");

    click(buttonByText("Продолжить редактирование"));
    expect(confirmation().open).toBe(false);
    expect(drawer().open).toBe(true);

    close();
    click(buttonByText("Закрыть без сохранения"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(drawer().open).toBe(false);
  });

  it("closes only the confirmation on Escape", () => {
    open({ initiallyDirty: true });
    pressEscape();
    pressEscape(confirmation());
    expect(confirmation().open).toBe(false);
    expect(drawer().open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cannot be closed while saving", () => {
    open({ isBusy: true });
    expect(pressEscape().defaultPrevented).toBe(true);
    clickBackdrop();
    expect(onClose).not.toHaveBeenCalled();
    expect(drawer().open).toBe(true);
  });
});
