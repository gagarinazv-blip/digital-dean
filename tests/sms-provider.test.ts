import { afterEach, describe, expect, it, vi } from "vitest";
import { DevSmsProvider } from "../src/lib/sms-provider";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("DevSmsProvider", () => {
  it("writes the fictional recipient and code only in development", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    const provider = new DevSmsProvider();

    await provider.sendCode("+79000000001", "123456");

    expect(info).toHaveBeenCalledWith(
      "[DEV SMS] +79000000001: код 123456",
    );
  });

  it("does not log or expose the code in production", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    const provider = new DevSmsProvider();

    await provider.sendCode("+79000000001", "123456");

    expect(info).not.toHaveBeenCalled();
  });
});
