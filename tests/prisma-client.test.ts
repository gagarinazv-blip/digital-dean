import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaConstructorMock, adapterConstructorMock } = vi.hoisted(() => ({
  prismaConstructorMock: vi.fn(),
  adapterConstructorMock: vi.fn(),
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaConstructorMock,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: adapterConstructorMock,
}));

import type { PrismaClient } from "../src/generated/prisma/client";
import { getPrisma } from "../src/lib/prisma";

const globalPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  delete globalPrisma.prisma;
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  vi.clearAllMocks();
});

afterEach(() => {
  delete globalPrisma.prisma;
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("getPrisma", () => {
  it("replaces a cached client missing the current schema delegates", () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const staleClient = {
      portfolioFolder: {},
      portfolioItem: {},
      studentDocument: {},
      $disconnect: disconnect,
    } as unknown as PrismaClient;
    const freshClient = {
      portfolioFolder: {},
      portfolioItem: {},
      studentDocument: {},
      opportunity: {},
      opportunityApplication: {},
      opportunityBookmark: {},
      applicationFile: {},
      $disconnect: vi.fn(),
    } as unknown as PrismaClient;
    const adapter = { connectionString: process.env.DATABASE_URL };
    adapterConstructorMock.mockImplementation(() => adapter);
    prismaConstructorMock.mockImplementation(() => freshClient);
    globalPrisma.prisma = staleClient;

    expect(getPrisma()).toBe(freshClient);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(prismaConstructorMock).toHaveBeenCalledOnce();
    expect(globalPrisma.prisma).toBe(freshClient);
  });

  it("reuses a cached client with the current schema delegates", () => {
    const client = {
      portfolioFolder: {},
      portfolioItem: {},
      studentDocument: {},
      opportunity: {},
      opportunityApplication: {},
      opportunityBookmark: {},
      applicationFile: {},
      $disconnect: vi.fn(),
    } as unknown as PrismaClient;
    globalPrisma.prisma = client;

    expect(getPrisma()).toBe(client);
    expect(prismaConstructorMock).not.toHaveBeenCalled();
  });
});
