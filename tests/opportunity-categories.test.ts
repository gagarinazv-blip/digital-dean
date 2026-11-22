import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OpportunityCategories,
  type OpportunityCategoryGroup,
} from "@/app/(campus)/opportunities/catalog/opportunity-categories";
import type { OpportunityType } from "@/generated/prisma/enums";

function category(
  type: OpportunityType,
  fullLabel: string,
  shortLabel: string,
  count: number,
) {
  return {
    type,
    href: `/opportunities/catalog?type=${type}&q=research`,
    fullLabel,
    shortLabel,
    iconPath: "M4 5h16",
    count,
  };
}

const groups: OpportunityCategoryGroup[] = [
  {
    id: "science-career",
    label: "Наука и карьера",
    count: 17,
    categories: [
      category("CONFERENCE", "Научные конференции", "Конференции", 3),
      category("COMPETITION", "Конкурсы", "Конкурсы", 0),
      category("INTERNSHIP", "Стажировки", "Стажировки", 4),
      category(
        "CASE_CHAMPIONSHIP",
        "Кейс-чемпионаты (хакатоны)",
        "Кейс-чемпионаты",
        2,
      ),
      category("GRANT", "Гранты", "Гранты", 5),
      category("EXCHANGE", "Академическая мобильность", "Мобильность", 3),
    ],
  },
  {
    id: "student-life",
    label: "Студенческая жизнь",
    count: 14,
    categories: [
      category("CLUB", "Клубы вуза", "Клубы", 4),
      category("CULTURAL", "Культурный центр", "Культурный центр", 3),
      category("SPORT", "Спортивный центр", "Спортивный центр", 2),
      category("VOLUNTEERING", "Волонтёрство", "Волонтёрство", 4),
      category("OTHER", "Другое", "Другое", 1),
    ],
  },
];
const catalogCss = readFileSync(
  fileURLToPath(
    new URL(
      "../src/app/(campus)/opportunities/catalog/opportunities.module.css",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("opportunity categories", () => {
  it("renders labeled groups, counts, full labels, and selected category URLs", () => {
    const markup = renderToStaticMarkup(
      createElement(OpportunityCategories, {
        allCount: 7,
        allHref: "/opportunities/catalog?q=research",
        allIconPath: "M12 3 14 9",
        groups,
        selectedCount: 2,
        selectedLabel: "Спортивный центр",
        selectedType: "SPORT",
      }),
    );

    expect(markup.match(/role="group"/g)).toHaveLength(4);
    expect(markup.match(/Наука и карьера/g)).toHaveLength(2);
    expect(markup.match(/Студенческая жизнь/g)).toHaveLength(2);
    expect(markup).toContain('aria-current="true"');
    expect(markup).toContain(
      'aria-label="Спортивный центр, 2 возможности, выбрано"',
    );
    expect(markup).toContain('href="/opportunities/catalog?type=SPORT&amp;q=research"');
    expect(markup).toContain(
      'href="/opportunities/catalog?q=research"',
    );
    for (const label of [
      "Конференции",
      "Конкурсы",
      "Стажировки",
      "Кейс-чемпионаты",
      "Гранты",
      "Мобильность",
      "Клубы",
      "Культурный центр",
      "Спортивный центр",
      "Волонтёрство",
      "Другое",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain('title="Научные конференции"');
    expect(markup).toContain('aria-label="Конкурсы, 0 возможностей"');
    expect(markup).toContain("Категория: Спортивный центр (2)");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Готово");
  });

  it("wraps pills and gives the mobile sheet touch-sized targets", () => {
    expect(catalogCss).toMatch(/\.categoryPills\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(catalogCss).toContain("@media (max-width: 767px)");
    expect(catalogCss).toMatch(
      /\.mobileSheetCategories \.categoryPill\s*\{[^}]*min-height:\s*44px/,
    );
    expect(catalogCss).not.toContain("overflow-x: auto");
  });
});
