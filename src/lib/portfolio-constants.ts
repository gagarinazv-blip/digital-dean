export const portfolioCategories = [
  "VOLUNTEERING",
  "SCIENCE",
  "COMPETITION",
  "SPORT",
  "CREATIVITY",
  "OTHER",
] as const;

export type PortfolioCategory = (typeof portfolioCategories)[number];

export const portfolioCategoryLabels: Record<PortfolioCategory, string> = {
  VOLUNTEERING: "Волонтёрство",
  SCIENCE: "Научные конференции",
  COMPETITION: "Конкурсы и олимпиады",
  SPORT: "Спорт",
  CREATIVITY: "Творчество",
  OTHER: "Другое",
};
