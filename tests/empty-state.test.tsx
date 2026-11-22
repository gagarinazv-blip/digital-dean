import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../src/components/empty-state";
import { getAvatarInitials, getAvatarTone } from "../src/lib/avatar";

describe("shared visual states", () => {
  it("renders a decorative inline illustration without requiring an image", () => {
    const markup = renderToStaticMarkup(
      <EmptyState illustration="schedule" title="Сегодня занятий нет" />,
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<img");
  });

  it("provides stable avatar colors and non-empty initials", () => {
    expect(getAvatarInitials("Александра Иванова")).toBe("АИ");
    expect(getAvatarInitials("  ")).toBe("?");
    expect(getAvatarTone("Александра Иванова")).toBe("blue");
    expect(getAvatarTone("александра иванова")).toBe("blue");
  });
});
