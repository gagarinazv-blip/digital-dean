import { describe, expect, it } from "vitest";
import {
  canDeletePortfolioItem,
  canEditPortfolioItem,
  consumePortfolioUploadQuota,
  PortfolioError,
} from "../src/lib/portfolio";

describe("portfolio permissions and upload limits", () => {
  it("limits students to editing and deleting their own-source records", () => {
    expect(canEditPortfolioItem("STUDENT", "STUDENT")).toBe(true);
    expect(canEditPortfolioItem("STUDENT", "STAFF")).toBe(false);
    expect(canDeletePortfolioItem("STUDENT", false, "STAFF")).toBe(false);
    expect(canDeletePortfolioItem("STUDENT", false, "STUDENT")).toBe(true);
  });

  it("allows staff to manage staff records and only managers to delete student records", () => {
    expect(canEditPortfolioItem("STAFF", "STAFF")).toBe(true);
    expect(canEditPortfolioItem("STAFF", "STUDENT")).toBe(false);
    expect(canDeletePortfolioItem("STAFF", false, "STUDENT")).toBe(false);
    expect(canDeletePortfolioItem("STAFF", true, "STUDENT")).toBe(true);
    expect(canDeletePortfolioItem("STAFF", false, "STAFF")).toBe(true);
  });

  it("enforces the per-user hourly upload quota", () => {
    const testUserId = 987654321;
    for (let upload = 0; upload < 20; upload += 1) {
      consumePortfolioUploadQuota(testUserId, 10_000);
    }

    let quotaError: unknown;
    try {
      consumePortfolioUploadQuota(testUserId, 10_001);
    } catch (error) {
      quotaError = error;
    }

    expect(quotaError).toBeInstanceOf(PortfolioError);
    expect(quotaError).toMatchObject({ status: 429 });
  });
});
