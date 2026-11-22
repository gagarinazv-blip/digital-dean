import type {
  OpportunityDirection,
  OpportunityType,
} from "@/generated/prisma/enums";

export type OpportunityDetailField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox";
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
};

type OpportunityTypeConfig = {
  label: string;
  group: "SCIENCE_CAREER" | "STUDENT_LIFE";
  icon: string;
  fields: OpportunityDetailField[];
};

const text = (
  name: string,
  label: string,
  required = true,
  maxLength = 180,
): OpportunityDetailField => ({
  name,
  label,
  type: "text",
  required,
  maxLength,
});

const paragraph = (
  name: string,
  label: string,
  required = true,
  maxLength = 1000,
): OpportunityDetailField => ({
  name,
  label,
  type: "textarea",
  required,
  maxLength,
});

const number = (
  name: string,
  label: string,
  min: number,
  max: number,
  required = true,
): OpportunityDetailField => ({
  name,
  label,
  type: "number",
  required,
  min,
  max,
});

const checkbox = (name: string, label: string): OpportunityDetailField => ({
  name,
  label,
  type: "checkbox",
});

export const opportunityTypeConfig: Record<
  OpportunityType,
  OpportunityTypeConfig
> = {
  CONFERENCE: {
    label: "Научные конференции",
    group: "SCIENCE_CAREER",
    icon: "book",
    fields: [
      text("topics", "Секции и темы"),
      text("participationFormat", "Формат участия"),
      paragraph("abstractRequirements", "Требования к тезисам", false),
      text("language", "Язык"),
    ],
  },
  COMPETITION: {
    label: "Конкурсы",
    group: "SCIENCE_CAREER",
    icon: "trophy",
    fields: [
      text("nominations", "Номинации"),
      text("prizeFund", "Призовой фонд", false),
      paragraph("stages", "Этапы конкурса", false),
    ],
  },
  INTERNSHIP: {
    label: "Стажировки",
    group: "SCIENCE_CAREER",
    icon: "briefcase",
    fields: [
      text("company", "Компания"),
      text("duration", "Срок"),
      checkbox("paid", "Стажировка оплачивается"),
      text("cityOrRemote", "Город или удалённый формат"),
      text("workload", "Занятость"),
    ],
  },
  CASE_CHAMPIONSHIP: {
    label: "Кейс-чемпионаты (хакатоны)",
    group: "SCIENCE_CAREER",
    icon: "code",
    fields: [
      number("minTeamSize", "Минимальный размер команды", 1, 20),
      number("maxTeamSize", "Максимальный размер команды", 1, 20),
      text("duration", "Длительность"),
      text("prizes", "Призы", false),
      text("caseFormat", "Формат кейса"),
      text("language", "Язык"),
    ],
  },
  GRANT: {
    label: "Гранты",
    group: "SCIENCE_CAREER",
    icon: "coins",
    fields: [
      text("amount", "Размер выплаты"),
      text("period", "Период"),
      paragraph("criteria", "Критерии отбора"),
      paragraph("stages", "Этапы отбора"),
      paragraph("minRequirements", "Минимальные требования"),
      number("count", "Количество грантов", 1, 1000),
    ],
  },
  EXCHANGE: {
    label: "Академическая мобильность",
    group: "SCIENCE_CAREER",
    icon: "globe",
    fields: [
      text("country", "Страна"),
      text("university", "Университет"),
      text("duration", "Срок"),
      text("studyLanguage", "Язык обучения"),
      text("financing", "Финансирование"),
      text("languageRequirements", "Требования к языку"),
    ],
  },
  CLUB: {
    label: "Клубы вуза",
    group: "STUDENT_LIFE",
    icon: "group",
    fields: [
      text("theme", "Тематика"),
      text("leader", "Руководитель"),
      text("schedule", "Расписание встреч"),
      text("location", "Аудитория"),
      number("seats", "Количество мест", 1, 10000),
      text("admission", "Вступление"),
    ],
  },
  CULTURAL: {
    label: "Культурный центр",
    group: "STUDENT_LIFE",
    icon: "music",
    fields: [
      text("ensembleName", "Название коллектива"),
      text("genre", "Жанр"),
      text("leader", "Руководитель"),
      text("rehearsalSchedule", "Расписание репетиций"),
      text("location", "Аудитория"),
      checkbox("auditionRequired", "Требуется прослушивание"),
      text("auditionWhen", "Когда проходит прослушивание", false),
      number("seats", "Количество мест", 1, 10000),
    ],
  },
  SPORT: {
    label: "Спортивный центр",
    group: "STUDENT_LIFE",
    icon: "fitness",
    fields: [
      text("section", "Секция"),
      text("coach", "Тренер"),
      text("schedule", "Расписание"),
      text("venue", "Место проведения"),
      text("level", "Уровень"),
      checkbox("medicalCertificate", "Нужна справка о допуске"),
      number("seats", "Количество мест", 1, 10000),
      checkbox("additionalRecruitment", "Дополнительный набор"),
      number("freeSpots", "Свободных мест", 0, 10000, false),
    ],
  },
  VOLUNTEERING: {
    label: "Волонтёрство",
    group: "STUDENT_LIFE",
    icon: "heart",
    fields: [
      text("project", "Проект"),
      text("schedule", "График и ожидаемая занятость"),
      number("hours", "Количество часов", 1, 10000),
      number("seats", "Количество мест", 1, 10000),
    ],
  },
  OTHER: {
    label: "Другое",
    group: "STUDENT_LIFE",
    icon: "sparkles",
    fields: [],
  },
};

export const opportunityTypes = Object.entries(opportunityTypeConfig).map(
  ([value, config]) => ({ value: value as OpportunityType, ...config }),
);

export const opportunityDirectionLabels: Record<OpportunityDirection, string> =
  {
    INTERNATIONAL_RELATIONS: "Международные отношения",
    ECONOMICS_FINANCE: "Экономика и финансы",
    LAW: "Право",
    REGIONAL_STUDIES: "Регионоведение",
    POLITICAL_SCIENCE: "Политология",
    JOURNALISM_MEDIA: "Журналистика и медиа",
    DATA_IT: "Данные и IT",
    LANGUAGES: "Языки и лингвистика",
    HISTORY_CULTURE: "История и культура",
    ARTS: "Искусство и творчество",
    SPORT_HEALTH: "Спорт и здоровье",
    SOCIAL_PROJECTS: "Социальные проекты",
  };

export const opportunityDirections = Object.entries(
  opportunityDirectionLabels,
).map(([value, label]) => ({
  value: value as OpportunityDirection,
  label,
}));

export type OpportunityDetails = Record<string, string | number | boolean>;

export function getOpportunityCardFacts(
  type: OpportunityType,
  details: OpportunityDetails,
): string[] {
  const config = opportunityTypeConfig[type];
  return config.fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => details[field.name])
    .filter(
      (value): value is string | number =>
        (typeof value === "string" && value.length > 0) ||
        typeof value === "number",
    )
    .slice(0, 3)
    .map(String);
}

export function isStudentEligible(
  opportunity: {
    minCourse: number | null;
    maxCourse: number | null;
    allowedFaculties: string[];
  },
  student: { course: number; faculty: string },
): { eligible: boolean; reason?: string } {
  if (
    opportunity.minCourse !== null &&
    student.course < opportunity.minCourse
  ) {
    return {
      eligible: false,
      reason: `Доступно с ${opportunity.minCourse} курса`,
    };
  }
  if (
    opportunity.maxCourse !== null &&
    student.course > opportunity.maxCourse
  ) {
    return {
      eligible: false,
      reason: `Доступно до ${opportunity.maxCourse} курса`,
    };
  }
  if (
    opportunity.allowedFaculties.length > 0 &&
    !opportunity.allowedFaculties.includes(student.faculty)
  ) {
    return { eligible: false, reason: "Недоступно для вашего факультета" };
  }
  return { eligible: true };
}

export function safeOpportunityReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.includes("\r") || value.includes("\n")) {
    return "/opportunities/catalog";
  }
  try {
    const url = new URL(value, "https://campus.invalid");
    if (
      url.origin !== "https://campus.invalid" ||
      (url.pathname !== "/opportunities" &&
        !url.pathname.startsWith("/opportunities/")) ||
      url.pathname.includes("\\")
    ) {
      return "/opportunities/catalog";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/opportunities/catalog";
  }
}

export type OpportunityDetailsValidation = {
  details: OpportunityDetails;
  errors: Record<string, string>;
};

export function validateOpportunityDetails(
  type: OpportunityType,
  input: Record<string, unknown>,
): OpportunityDetailsValidation {
  const config = opportunityTypeConfig[type];
  const details: OpportunityDetails = {};
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const raw = input[field.name];

    if (field.type === "checkbox") {
      details[field.name] = raw === true || raw === "true" || raw === "on";
      continue;
    }

    if (field.type === "number") {
      if (raw === undefined || raw === null || raw === "") {
        if (field.required) errors[field.name] = "Заполните поле.";
        continue;
      }
      const value = typeof raw === "number" ? raw : Number(raw);
      if (
        !Number.isInteger(value) ||
        value < (field.min ?? Number.MIN_SAFE_INTEGER) ||
        value > (field.max ?? Number.MAX_SAFE_INTEGER)
      ) {
        errors[field.name] = "Введите целое число в допустимом диапазоне.";
        continue;
      }
      details[field.name] = value;
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) errors[field.name] = "Заполните поле.";
      continue;
    }
    if (value.length > (field.maxLength ?? 180)) {
      errors[field.name] = `Максимум ${field.maxLength ?? 180} символов.`;
      continue;
    }
    details[field.name] = value;
  }

  if (
    type === "CASE_CHAMPIONSHIP" &&
    typeof details.minTeamSize === "number" &&
    typeof details.maxTeamSize === "number" &&
    details.minTeamSize > details.maxTeamSize
  ) {
    errors.maxTeamSize = "Максимальный размер команды меньше минимального.";
  }

  if (
    type === "SPORT" &&
    details.additionalRecruitment === true &&
    typeof details.freeSpots !== "number"
  ) {
    errors.freeSpots = "Укажите число свободных мест для дополнительного набора.";
  }

  return { details, errors };
}
