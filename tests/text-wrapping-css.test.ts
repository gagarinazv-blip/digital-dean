import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function getStyleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return getStyleFiles(path);
    return entry.isFile() && path.endsWith(".css") ? [path] : [];
  });
}

describe("application text wrapping", () => {
  it("does not allow arbitrary mid-word breaks in CSS", () => {
    const violations = getStyleFiles(join(process.cwd(), "src")).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /(?:word-break\s*:\s*break-all|overflow-wrap\s*:\s*anywhere)/i.test(
        source,
      )
        ? [path]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
