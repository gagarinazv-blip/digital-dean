import { describe, expect, it } from "vitest";
import {
  formatRoom,
  formatRoomTitle,
  getOnlineLink,
  joinDetails,
} from "../src/lib/room-format";

describe("room label", () => {
  it.each([
    ["101", "ауд. 101"],
    ["МО-101", "ауд. МО-101"],
    ["МО-101, ауд. 101", "МО-101, ауд. 101"],
    ["ауд. МО-101, ауд. 101", "ауд. МО-101, ауд. 101"],
    ["ауд. ауд. 101", "ауд. 101"],
    ["ауд.101", "ауд. 101"],
    ["МО-101, 214", "МО-101, ауд. 214"],
    ["Корпус А, аудитория 214", "Корпус А, аудитория 214"],
    ["  МО-101 ,, ауд.  101 , ", "МО-101, ауд. 101"],
    ["ауд. 101, ауд. 101", "ауд. 101"],
    ["каб. 12", "каб. 12"],
    ["Онлайн", "Онлайн"],
    ["https://meet.example.test/x", "Онлайн"],
    ["Кабельная 3", "ауд. Кабельная 3"],
  ])("formats %j as %j", (room, label) => {
    expect(formatRoom(room)).toBe(label);
  });

  it.each([null, undefined, "", " , ", "ауд. "])("returns nothing for %j", (room) => {
    expect(formatRoom(room)).toBeNull();
    expect(formatRoomTitle(room)).toBeNull();
  });

  it("capitalizes a standalone label and skips empty separators", () => {
    expect(formatRoomTitle("101")).toBe("Ауд. 101");
    expect(joinDetails("Лекция", formatRoom(""), null)).toBe("Лекция");
    expect(joinDetails("Лекция", formatRoom("101"))).toBe("Лекция · ауд. 101");
  });

  it("finds a connection link but ignores other schemes", () => {
    expect(getOnlineLink("Онлайн", "Ссылка: https://meet.example.test/x, вход с 9:00")).toBe(
      "https://meet.example.test/x",
    );
    expect(getOnlineLink("javascript:alert(1)", null)).toBeNull();
  });
});
