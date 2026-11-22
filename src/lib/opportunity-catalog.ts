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
  placeholder?: string;
};

type OpportunityTypeConfig = {
  label: string;
  group: "SCIENCE_CAREER" | "STUDENT_LIFE";
  icon: string;
  opportunityDetailsSchema: OpportunityDetailField[];
};

export type OpportunityApplicationAnswerOption = {
  value: string;
  label: string;
};

export type OpportunityApplicationAnswerField = {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "checkbox"
    | "select"
    | "choice"
    | "multiselect";
  required?: boolean;
  maxLength?: number;
  options?: OpportunityApplicationAnswerOption[];
  choiceSource?: "participationFormat" | "nominations" | "directions" | "portfolioItems";
  visibleWhen?: "auditionRequired" | "notLookingForTeam";
  hint?: string;
};

export type OpportunityApplicationAnswerSchema = {
  fields: OpportunityApplicationAnswerField[];
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
    opportunityDetailsSchema: [
      text("topics", "Секции и темы"),
      text("participationFormat", "Форматы участия (через запятую)"),
      paragraph("abstractRequirements", "Требования к тезисам", false),
      text("language", "Язык"),
    ],
  },
  COMPETITION: {
    label: "Конкурсы",
    group: "SCIENCE_CAREER",
    icon: "trophy",
    opportunityDetailsSchema: [
      text("nominations", "Номинации (через запятую)"),
      text("prizeFund", "Призовой фонд", false),
      paragraph("stages", "Этапы конкурса", false),
    ],
  },
  INTERNSHIP: {
    label: "Стажировки",
    group: "SCIENCE_CAREER",
    icon: "briefcase",
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [
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
    opportunityDetailsSchema: [],
  },
};

function answerText(
  name: string,
  label: string,
  required = false,
  maxLength = 500,
): OpportunityApplicationAnswerField {
  return { name, label, type: "text", required, maxLength };
}

function answerParagraph(
  name: string,
  label: string,
  required = false,
  maxLength = 1000,
): OpportunityApplicationAnswerField {
  return { name, label, type: "textarea", required, maxLength };
}

function answerChoice(
  name: string,
  label: string,
  choiceSource: OpportunityApplicationAnswerField["choiceSource"],
  required = false,
): OpportunityApplicationAnswerField {
  return { name, label, type: "choice", choiceSource, required };
}

function motivation(
  label = "Мотивация или комментарий",
  required = false,
): OpportunityApplicationAnswerField {
  return { name: "motivation", label, type: "textarea", maxLength: 2000, required };
}

export const applicationAnswersSchema: Record<
  OpportunityType,
  OpportunityApplicationAnswerSchema
> = {
  CONFERENCE: {
    fields: [
      answerParagraph("topic", "Тема доклада", true),
      answerChoice(
        "participationFormat",
        "Формат участия",
        "participationFormat",
        true,
      ),
      motivation(),
    ],
  },
  COMPETITION: {
    fields: [
      answerChoice("nomination", "Номинация", "nominations", true),
      motivation(),
    ],
  },
  INTERNSHIP: {
    fields: [
      answerText("preferredTiming", "Предпочтительные сроки", false),
      motivation(),
    ],
  },
  CASE_CHAMPIONSHIP: {
    fields: [
      answerText("teamName", "Название команды", true),
      {
        name: "lookingForTeam",
        label: "Ищу команду",
        type: "checkbox",
      },
      {
        ...answerParagraph("teamMembers", "Состав команды", false, 2000),
        visibleWhen: "notLookingForTeam",
        hint: "Укажите каждого участника с новой строки: ФИО — группа.",
      },
      motivation(),
    ],
  },
  GRANT: {
    fields: [
      answerParagraph("researchTopic", "Тема исследования", true),
      {
        name: "portfolioItemIds",
        label: "Научные достижения из портфолио",
        type: "multiselect",
        choiceSource: "portfolioItems",
        hint: "Можно выбрать несколько записей из вашего портфолио.",
      },
      motivation(),
    ],
  },
  EXCHANGE: {
    fields: [
      answerChoice("desiredProgram", "Желаемая программа или направление", "directions"),
      motivation("Мотивация", true),
    ],
  },
  CLUB: {
    fields: [
      motivation("Почему хотите вступить", true),
      answerParagraph("experience", "Опыт", false),
    ],
  },
  CULTURAL: {
    fields: [
      motivation("Почему хотите вступить", true),
      answerParagraph("experience", "Опыт", false),
      {
        ...answerText("auditionTime", "Удобное время прослушивания", true),
        visibleWhen: "auditionRequired",
      },
    ],
  },
  SPORT: {
    fields: [
      {
        name: "trainingLevel",
        label: "Уровень подготовки",
        type: "select",
        required: true,
        options: [
          { value: "beginner", label: "Начальный" },
          { value: "intermediate", label: "Средний" },
          { value: "advanced", label: "Продвинутый" },
        ],
      },
      {
        name: "medicalRestrictions",
        label: "Есть медицинские ограничения",
        type: "checkbox",
      },
      motivation(),
    ],
  },
  VOLUNTEERING: {
    fields: [
      motivation("Почему хотите участвовать", true),
      answerParagraph("availability", "Доступные дни и время", false),
    ],
  },
  OTHER: {
    fields: [motivation("Мотивация", true)],
  },
};

function asDetailsRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseChoiceList(value: unknown): OpportunityApplicationAnswerOption[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean))]
    .map((label) => ({ value: label, label }));
}

export function getOpportunityApplicationFields(
  type: OpportunityType,
  options: {
    eventDetails?: unknown;
    directions?: readonly OpportunityDirection[];
    portfolioItems?: readonly { id: number; title: string }[];
  } = {},
): OpportunityApplicationAnswerField[] {
  const eventDetails = asDetailsRecord(options.eventDetails);

  return applicationAnswersSchema[type].fields.flatMap((field) => {
    if (
      field.visibleWhen === "auditionRequired" &&
      eventDetails.auditionRequired !== true
    ) {
      return [];
    }

    if (field.type !== "choice" && field.type !== "multiselect") {
      return [field];
    }

    let choices: OpportunityApplicationAnswerOption[] = [];
    if (field.choiceSource === "participationFormat") {
      choices = parseChoiceList(eventDetails.participationFormat);
    } else if (field.choiceSource === "nominations") {
      choices = parseChoiceList(eventDetails.nominations);
    } else if (field.choiceSource === "directions") {
      choices = (options.directions ?? []).map((direction) => ({
        value: direction,
        label: opportunityDirectionLabels[direction],
      }));
    } else if (field.choiceSource === "portfolioItems") {
      choices = (options.portfolioItems ?? []).map((item) => ({
        value: String(item.id),
        label: item.title,
      }));
    }

    if (field.type === "multiselect") {
      return [{ ...field, options: choices }];
    }

    if (choices.length > 0) {
      return [{ ...field, type: "select", options: choices }];
    }

    return [
      {
        ...field,
        type: "text",
        choiceSource: undefined,
        required: false,
        hint:
          field.choiceSource === "directions"
            ? "Перечень направлений для выбора не задан; укажите желаемую программу."
            : "Перечень вариантов для выбора не задан.",
      },
    ];
  });
}

export function getOpportunityApplicationAnswerInput(
  formData: FormData,
  fields: readonly OpportunityApplicationAnswerField[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    const values = formData.getAll(`answer_${field.name}`);
    input[field.name] =
      field.type === "multiselect"
        ? values.filter((value): value is string => typeof value === "string")
        : values.find((value): value is string => typeof value === "string");
  }

  return input;
}

export function getOpportunityApplicationRequirements(
  type: OpportunityType,
  eventDetails: unknown,
  requirements: readonly {
    key: string;
    title: string;
    required: boolean;
  }[],
): Array<{ key: string; title: string; required: boolean }> {
  const details = asDetailsRecord(eventDetails);
  if (type !== "SPORT" || details.medicalCertificate !== true) {
    return [...requirements];
  }

  const certificate = requirements.find(
    ({ key }) => key === "medical-certificate",
  );
  const withoutCertificate = requirements.filter(
    ({ key }) => key !== "medical-certificate",
  );
  return [
    ...withoutCertificate,
    certificate
      ? { ...certificate, required: true }
      : {
          key: "medical-certificate",
          title: "Справка о допуске",
          required: true,
        },
  ];
}

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
export type OpportunityApplicationAnswers = Record<
  string,
  string | boolean | string[] | number[]
>;

export type OpportunityDetailFact = {
  label: string;
  value: string;
};

export function getOpportunityDetailFacts(
  type: OpportunityType,
  details: OpportunityDetails,
): OpportunityDetailFact[] {
  return opportunityTypeConfig[type].opportunityDetailsSchema.flatMap((field) => {
    const value = details[field.name];
    if (value === undefined || value === "") return [];
    return [
      {
        label: field.label,
        value:
          typeof value === "boolean"
            ? value
              ? "Да"
              : "Нет"
            : String(value),
      },
    ];
  });
}

export function getOpportunityCardFacts(
  type: OpportunityType,
  details: OpportunityDetails,
): string[] {
  return getOpportunityDetailFacts(type, details)
    .slice(0, 3)
    .map(({ value }) => value);
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

export type OpportunityApplicationAnswerValidation = {
  details: OpportunityApplicationAnswers;
  motivation: string | null;
  errors: Record<string, string>;
};

export function filterOpportunityApplicationAnswers(
  type: OpportunityType,
  value: unknown,
): OpportunityApplicationAnswers {
  const input = asDetailsRecord(value);
  const answers: OpportunityApplicationAnswers = {};

  for (const field of applicationAnswersSchema[type].fields) {
    if (field.name === "motivation") continue;
    const raw = input[field.name];

    if (field.type === "checkbox") {
      if (typeof raw === "boolean") answers[field.name] = raw;
      continue;
    }

    if (field.type === "multiselect") {
      if (Array.isArray(raw)) {
        answers[field.name] = raw.filter(
          (item): item is number =>
            typeof item === "number" &&
            Number.isSafeInteger(item) &&
            item > 0,
        );
      }
      continue;
    }

    if (field.name === "teamMembers" && Array.isArray(raw)) {
      answers[field.name] = raw.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length <= 180,
      );
      continue;
    }

    if (typeof raw === "string" && raw.length <= (field.maxLength ?? 500)) {
      answers[field.name] = raw;
    }
  }

  return answers;
}

export function validateOpportunityApplicationAnswers(
  type: OpportunityType,
  input: Record<string, unknown>,
  options: {
    eventDetails?: unknown;
    directions?: readonly OpportunityDirection[];
    portfolioItems?: readonly { id: number; title: string }[];
  } = {},
): OpportunityApplicationAnswerValidation {
  const fields = getOpportunityApplicationFields(type, options);
  const eventDetails = asDetailsRecord(options.eventDetails);
  const details: OpportunityApplicationAnswers = {};
  const errors: Record<string, string> = {};
  let motivationValue: string | null = null;
  const lookingForTeam = input.lookingForTeam === true ||
    input.lookingForTeam === "true" ||
    input.lookingForTeam === "on";

  for (const field of fields) {
    if (field.name === "teamMembers" && lookingForTeam) continue;

    const raw = input[field.name];
    if (field.type === "checkbox") {
      if (
        raw !== undefined &&
        raw !== null &&
        raw !== "" &&
        raw !== false &&
        raw !== "false" &&
        raw !== true &&
        raw !== "true" &&
        raw !== "on"
      ) {
        errors[field.name] = "Некорректное значение.";
        continue;
      }
      details[field.name] =
        raw === true || raw === "true" || raw === "on";
      continue;
    }

    if (field.type === "multiselect") {
      const selectedValues = (Array.isArray(raw) ? raw : raw == null ? [] : [raw])
        .filter((value): value is string => typeof value === "string");
      const allowedValues = new Set((field.options ?? []).map(({ value }) => value));
      const selected = [...new Set(selectedValues)];
      if (
        selected.length > 20 ||
        selected.some((value) => !allowedValues.has(value))
      ) {
        errors[field.name] = "Выберите только записи из своего портфолио.";
        continue;
      }
      details[field.name] = selected.map(Number);
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) errors[field.name] = "Заполните поле.";
      if (field.name === "teamMembers" && !lookingForTeam) {
        errors[field.name] = "Укажите состав команды или отметьте «Ищу команду».";
      }
      continue;
    }

    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = `Максимум ${field.maxLength} символов.`;
      continue;
    }

    if (field.type === "select") {
      const allowedValues = new Set((field.options ?? []).map(({ value }) => value));
      if (!allowedValues.has(value)) {
        errors[field.name] = "Выберите один из предложенных вариантов.";
        continue;
      }
    }

    if (field.name === "teamMembers") {
      const members = value.split(/\r?\n/).map((member) => member.trim()).filter(Boolean);
      const maxTeamSize =
        typeof eventDetails.maxTeamSize === "number"
          ? eventDetails.maxTeamSize
          : 20;
      const minTeamSize =
        typeof eventDetails.minTeamSize === "number"
          ? eventDetails.minTeamSize
          : 1;
      const maxMembers = Math.max(0, maxTeamSize - 1);
      const minMembers = Math.max(1, minTeamSize - 1);
      if (members.some((member) => member.length > 180)) {
        errors[field.name] = "Укажите для каждого участника ФИО и группу (до 180 символов).";
        continue;
      }
      if (members.length > maxMembers) {
        errors[field.name] = `В составе может быть не более ${maxMembers} дополнительных участников.`;
        continue;
      }
      if (members.length < minMembers) {
        errors[field.name] = `Для команды нужно указать не менее ${minMembers} дополнительных участников или отметить «Ищу команду».`;
        continue;
      }
      details[field.name] = members;
      continue;
    }

    if (field.name === "motivation") {
      motivationValue = value;
      continue;
    }

    details[field.name] = value;
  }

  return { details, motivation: motivationValue, errors };
}

export function validateOpportunityDetails(
  type: OpportunityType,
  value: unknown,
): OpportunityDetailsValidation {
  const input = asDetailsRecord(value);
  const config = opportunityTypeConfig[type];
  const details: OpportunityDetails = {};
  const errors: Record<string, string> = {};

  for (const field of config.opportunityDetailsSchema) {
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

  if (type === "CULTURAL") {
    if (details.auditionRequired === true && !details.auditionWhen) {
      errors.auditionWhen = "Укажите время прослушивания.";
    } else if (details.auditionRequired !== true) {
      delete details.auditionWhen;
    }
  }

  if (type === "SPORT") {
    if (
      details.additionalRecruitment === true &&
      typeof details.freeSpots !== "number"
    ) {
      errors.freeSpots = "Укажите число свободных мест для дополнительного набора.";
    } else if (details.additionalRecruitment !== true) {
      delete details.freeSpots;
    }
  }

  return { details, errors };
}
