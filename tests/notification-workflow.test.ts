import { describe, expect, it } from "vitest";
import { buildNotificationTargetHref } from "../src/lib/notification-workflow";

describe("notification target links", () => {
  it("builds safe contextual links for all notification types", () => {
    expect(
      buildNotificationTargetHref(
        "SCHEDULE_CHANGE",
        "SCHEDULE_ITEM",
        "42",
      ),
    ).toBe("/schedule?view=week&lesson=42#lesson-42");
    expect(
      buildNotificationTargetHref(
        "SCHEDULE_CHANGE",
        "ACADEMIC_SESSION",
        "19",
      ),
    ).toBe("/schedule?section=session&event=19");
    expect(
      buildNotificationTargetHref("DEADLINE", "DEADLINE", "deadline-cuid"),
    ).toBe("/deadlines/deadline-cuid");
    expect(
      buildNotificationTargetHref(
        "REQUEST_STATUS",
        "REQUEST",
        "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      ),
    ).toBe("/requests/b08f54cf-99ce-4a56-a780-8e22ce5ba0a1");
  });

  it("rejects mismatched target types and malformed identifiers", () => {
    expect(
      buildNotificationTargetHref("DEADLINE", "REQUEST", "id"),
    ).toBeNull();
    expect(
      buildNotificationTargetHref("SCHEDULE_CHANGE", "SCHEDULE_ITEM", "0"),
    ).toBeNull();
    expect(
      buildNotificationTargetHref(
        "SCHEDULE_CHANGE",
        "ACADEMIC_SESSION",
        "not-an-id",
      ),
    ).toBeNull();
    expect(
      buildNotificationTargetHref(
        "REQUEST_STATUS",
        "REQUEST",
        "not-a-public-id",
      ),
    ).toBeNull();
  });

  it("keeps announcements in the notification center without inventing a target", () => {
    expect(
      buildNotificationTargetHref("ANNOUNCEMENT", null, null),
    ).toBeNull();
    expect(
      buildNotificationTargetHref("ANNOUNCEMENT", "REQUEST", "id"),
    ).toBeNull();
  });
});
