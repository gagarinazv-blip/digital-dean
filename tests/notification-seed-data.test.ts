import { describe, expect, it } from "vitest";
import { getDemoNotificationState } from "../prisma/notification-seed-data";

describe("demo notification seed data", () => {
  it("uses stable dates and contrasting read states for both demo students", () => {
    const now = new Date("2026-11-20T12:00:00.000Z");
    const kinds = ["schedule", "request", "deadline", "announcement"] as const;
    const alpha = kinds.map((kind, index) =>
      getDemoNotificationState("student.alpha", kind, now, index),
    );
    const beta = kinds.map((kind, index) =>
      getDemoNotificationState("student.beta", kind, now, index),
    );
    const repeatedAlpha = kinds.map((kind, index) =>
      getDemoNotificationState("student.alpha", kind, now, index),
    );

    expect(alpha).toEqual(repeatedAlpha);
    expect(alpha.map(({ isRead }) => isRead)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(beta.map(({ isRead }) => isRead)).toEqual([
      true,
      false,
      true,
      true,
    ]);
    expect(alpha.map(({ createdAt }) => createdAt.toISOString())).not.toEqual(
      beta.map(({ createdAt }) => createdAt.toISOString()),
    );
  });
});
