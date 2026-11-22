import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentSectionNavigationLinks } from "../src/components/document-section-navigation";
import {
  documentSectionItems,
  getActiveDocumentSection,
} from "../src/lib/document-section-navigation";

describe("document section navigation", () => {
  it.each([
    ["/documents", "catalog", "catalog"],
    ["/requests", "requests", "requests"],
    ["/requests/new", null, "requests"],
    ["/documents", "documents", "ready"],
    ["/documents/mine", null, "mine"],
  ] as const)(
    "selects the correct active item for %s",
    (pathname, tab, expected) => {
      const active = getActiveDocumentSection(pathname, tab);
      const markup = renderToStaticMarkup(
        createElement(DocumentSectionNavigationLinks, { active }),
      );
      const activeItem = documentSectionItems.find(
        (item) => item.key === expected,
      );

      expect(active).toBe(expected);
      expect(activeItem).toBeDefined();
      expect(markup).toContain(`href="${activeItem?.href}"`);
      expect(markup).toContain('aria-current="page"');
      expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    },
  );

  it("provides one link for each documents and requests subsection", () => {
    expect(documentSectionItems.map((item) => item.label)).toEqual([
      "Запросить справку",
      "Мои заявки",
      "Готовые документы",
      "Мои документы",
    ]);
  });
});
