// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

import { PortfolioItemDrawer } from "../src/app/(campus)/documents/portfolio-item-drawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type FakeResponse = { status: number; body: unknown } | "network-error";

let responses: FakeResponse[] = [];
let sent: { method: string; url: string; data: FormData }[] = [];
let holdResponse: (() => void) | null = null;
let shouldHold = false;

class FakeXMLHttpRequest {
  upload = { addEventListener: () => {} };
  status = 0;
  responseText = "";
  private method = "";
  private url = "";
  private listeners: Record<string, () => void> = {};

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  addEventListener(name: string, listener: () => void) {
    this.listeners[name] = listener;
  }

  send(data: FormData) {
    sent.push({ method: this.method, url: this.url, data });
    const finish = () => {
      const response = responses.shift();
      if (!response || response === "network-error") {
        this.listeners.error();
        return;
      }
      this.status = response.status;
      this.responseText = JSON.stringify(response.body);
      this.listeners.load();
    };
    if (shouldHold) holdResponse = finish;
    else finish();
  }
}

const item = {
  id: 7,
  title: "Победа в олимпиаде",
  category: "SCIENCE" as const,
  eventName: null,
  eventDate: new Date("2026-04-20T00:00:00.000Z"),
  role: null,
  description: null,
};

let container: HTMLDivElement;
let root: Root;

const dialog = () => document.querySelector<HTMLDialogElement>("dialog")!;
const field = (name: string) =>
  document.querySelector<HTMLInputElement>(`dialog [name="${name}"]`)!;
const errorOf = (name: string) =>
  (field(name).getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
const alert = () => document.querySelector("dialog [role=alert]")?.textContent;
const button = (text: string) =>
  [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent === text,
  )!;

async function submit() {
  await act(async () => {
    document
      .querySelector("dialog form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

function type(name: string, value: string) {
  act(() => {
    const element = field(name);
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  responses = [];
  sent = [];
  holdResponse = null;
  shouldHold = false;
  refreshMock.mockClear();
  vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <PortfolioItemDrawer
        isStaff={false}
        item={item}
        triggerLabel="Редактировать"
      />,
    ),
  );
  act(() => button("Редактировать").click());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("achievement drawer", () => {
  it("explains a client error under the field and sends nothing", async () => {
    type("title", "   ");
    await submit();

    expect(sent).toHaveLength(0);
    expect(field("title").getAttribute("aria-invalid")).toBe("true");
    expect(errorOf("title")).toContain("Введите название достижения.");
    expect(alert()).toBe("Проверьте выделенные поля.");
    expect(dialog().open).toBe(true);

    type("title", "Исправлено");
    expect(field("title").getAttribute("aria-invalid")).toBeNull();
  });

  it("saves valid data, closes, and refreshes the list", async () => {
    responses = [{ status: 200, body: { id: 7, message: "Изменения сохранены." } }];
    type("title", "Новое название");
    await submit();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "PUT", url: "/api/portfolio/items/7" });
    expect(sent[0].data.get("title")).toBe("Новое название");
    expect(dialog().open).toBe(false);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[role=status]")?.textContent).toBe(
      "Изменения сохранены.",
    );
  });

  it.each([
    [
      { status: 500, body: { error: "Не удалось сохранить изменения." } } as const,
      "Не удалось сохранить изменения.",
    ],
    ["network-error" as const, "Не удалось связаться с сервером"],
  ])("keeps the entered data after a server failure", async (response, message) => {
    responses = [response];
    type("title", "Черновик названия");
    await submit();

    expect(dialog().open).toBe(true);
    expect(field("title").value).toBe("Черновик названия");
    expect(alert()).toContain(message);
    expect(refreshMock).not.toHaveBeenCalled();
    expect(button("Сохранить").disabled).toBe(false);
  });

  it("shows a server validation error under its field", async () => {
    responses = [
      {
        status: 400,
        body: {
          error: "Проверьте выделенные поля.",
          fieldErrors: { role: "Роль — не более 100 символов." },
        },
      },
    ];
    await submit();

    expect(errorOf("role")).toContain("Роль — не более 100 символов.");
    expect(document.activeElement).toBe(field("role"));
  });

  it("blocks a repeated submit while saving", async () => {
    shouldHold = true;
    responses = [{ status: 200, body: { message: "Изменения сохранены." } }];
    await submit();

    expect(button("Сохраняется…").disabled).toBe(true);
    await submit();
    expect(sent).toHaveLength(1);

    await act(async () => holdResponse!());
    expect(dialog().open).toBe(false);
  });
});
