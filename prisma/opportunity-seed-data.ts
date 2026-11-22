import type { Prisma } from "../src/generated/prisma/client";
import type {
  OpportunityCost,
  OpportunityDirection,
  OpportunityFormat,
  OpportunityStatus,
  OpportunityType,
} from "../src/generated/prisma/enums";

export type OpportunitySeed = {
  title: string;
  type: OpportunityType;
  organizer: string;
  direction: OpportunityDirection;
  offset: number;
  status: OpportunityStatus;
  format: OpportunityFormat;
  cost: OpportunityCost;
  details: Prisma.InputJsonObject;
  location?: string;
  costNote?: string;
  allowLateRequests?: boolean;
};

function makeSeedSet(
  type: OpportunityType,
  entries: Array<{
    title: string;
    organizer: string;
    direction: OpportunityDirection;
    offset: number;
    status?: OpportunityStatus;
    format?: OpportunityFormat;
    cost?: OpportunityCost;
    location?: string;
    costNote?: string;
    allowLateRequests?: boolean;
  }>,
): OpportunitySeed[] {
  return entries.map((entry, index) => {
    const label = `Демо-набор ${index + 1}`;
    const details: Record<string, string | number | boolean> = {
      CLUB: {
        theme: "Практика и обмен опытом",
        leader: `Вымышленный руководитель ${index + 1}`,
        schedule: "Раз в неделю",
        location: "Кампус, аудитория 204",
        seats: 24,
        admission: "Короткая встреча-знакомство",
      },
      CULTURAL: {
        ensembleName: label,
        genre: "Современная программа",
        leader: `Вымышленный руководитель ${index + 1}`,
        rehearsalSchedule: "По вторникам",
        location: "Кампус, студия 3",
        auditionRequired: index % 2 === 0,
        seats: 18,
      },
      SPORT: {
        section: label,
        coach: `Вымышленный тренер ${index + 1}`,
        schedule: "По понедельникам и четвергам",
        venue: "Спортивный корпус, зал 2",
        level: "Начальный и средний",
        medicalCertificate: index % 2 === 0,
        seats: 20,
        additionalRecruitment: index % 2 === 1,
        freeSpots: 6,
      },
      GRANT: {
        amount: "До 80 000 ₽",
        period: "Один семестр",
        criteria: "Учебный или исследовательский проект",
        stages: "Заявка и короткое собеседование",
        minRequirements: "Студент бакалавриата или магистратуры",
        count: 8,
      },
      CASE_CHAMPIONSHIP: {
        minTeamSize: 2,
        maxTeamSize: 5,
        duration: "Две недели",
        prizes: "Демо-награды",
        caseFormat: "Командный кейс",
        language: "Русский",
      },
      CONFERENCE: {
        topics: "Международные исследования и современные практики",
        participationFormat: "Доклад или слушатель",
        abstractRequirements: "Тезисы до 2 000 знаков",
        language: "Русский или английский",
      },
      COMPETITION: {
        nominations: "Открытая номинация",
        prizeFund: "Демо-награды",
        stages: "Отбор и финальная презентация",
      },
      INTERNSHIP: {
        company: "Вымышленная организация",
        duration: "Один семестр",
        paid: index % 2 === 0,
        cityOrRemote: "Москва или гибридно",
        workload: "До 20 часов в неделю",
      },
      EXCHANGE: {
        country: "Вымышленная страна",
        university: "Демо-университет",
        duration: "Один семестр",
        studyLanguage: "Английский",
        financing: "По условиям программы",
        languageRequirements: "Подтверждение уровня B2",
      },
      VOLUNTEERING: {
        project: label,
        schedule: "Несколько смен в течение месяца",
        hours: 12,
        seats: 30,
      },
      OTHER: {},
    }[type];

    return {
      ...entry,
      type,
      status: entry.status ?? "PUBLISHED",
      format: entry.format ?? "HYBRID",
      cost: entry.cost ?? "FREE",
      details,
    };
  });
}

export const opportunitySeeds: OpportunitySeed[] = [
  ...makeSeedSet("CLUB", [
    { title: "Клуб международных дебатов", organizer: "Дискуссионный клуб кампуса", direction: "POLITICAL_SCIENCE", offset: 14 },
    { title: "Клуб студенческой дипломатии", organizer: "Студенческое сообщество", direction: "INTERNATIONAL_RELATIONS", offset: 21 },
    { title: "Клуб финансовой грамотности", organizer: "Вымышленная академическая лаборатория", direction: "ECONOMICS_FINANCE", offset: 28 },
    { title: "Клуб разговорных языков", organizer: "Языковое сообщество кампуса", direction: "LANGUAGES", offset: 10 },
    { title: "Клуб наставничества", organizer: "Центр студенческих инициатив", direction: "SOCIAL_PROJECTS", offset: 35, status: "DRAFT" },
    { title: "Клуб данных и аналитики", organizer: "Демо-центр прикладных исследований", direction: "DATA_IT", offset: 16 },
  ]),
  ...makeSeedSet("CULTURAL", [
    { title: "Студенческий камерный хор", organizer: "Культурный центр кампуса", direction: "ARTS", offset: 17 },
    { title: "Театральная лаборатория", organizer: "Вымышленная студия сцены", direction: "ARTS", offset: 24 },
    { title: "Мастерская документальной фотографии", organizer: "Медиацентр кампуса", direction: "JOURNALISM_MEDIA", offset: 12 },
    { title: "Студия современного танца", organizer: "Культурный центр кампуса", direction: "ARTS", offset: 19 },
    { title: "Литературная гостиная", organizer: "Демо-книжный клуб", direction: "HISTORY_CULTURE", offset: 32, status: "DRAFT" },
    { title: "Музыкальная мастерская", organizer: "Вымышленная музыкальная лаборатория", direction: "ARTS", offset: 15 },
  ]),
  ...makeSeedSet("SPORT", [
    { title: "Секция плавания", organizer: "Спортивный центр кампуса", direction: "SPORT_HEALTH", offset: 11 },
    { title: "Секция фехтования", organizer: "Демо-спортивная школа", direction: "SPORT_HEALTH", offset: 18 },
    { title: "Студенческая баскетбольная лига", organizer: "Спортивный центр кампуса", direction: "SPORT_HEALTH", offset: 25 },
    { title: "Секция волейбола", organizer: "Команда кампуса", direction: "SPORT_HEALTH", offset: 14 },
    { title: "Беговой клуб", organizer: "Вымышленное сообщество активного кампуса", direction: "SPORT_HEALTH", offset: 9, cost: "PAID", costNote: "Демо-взнос за инвентарь" },
    { title: "Секция йоги", organizer: "Центр студенческого благополучия", direction: "SPORT_HEALTH", offset: 22 },
    { title: "Клуб бадминтона", organizer: "Спортивный центр кампуса", direction: "SPORT_HEALTH", offset: 31, status: "DRAFT" },
    { title: "Открытый набор в секцию скалолазания", organizer: "Демо-клуб активного отдыха", direction: "SPORT_HEALTH", offset: -3, allowLateRequests: true },
  ]),
  ...makeSeedSet("GRANT", [
    { title: "Грант на студенческое исследование", organizer: "Вымышленный фонд академических проектов", direction: "SOCIAL_PROJECTS", offset: 27 },
    { title: "Грант на полевую практику", organizer: "Демо-центр региональных исследований", direction: "REGIONAL_STUDIES", offset: 38 },
    { title: "Грант на общественную инициативу", organizer: "Фонд студенческих инициатив", direction: "SOCIAL_PROJECTS", offset: -5, status: "ARCHIVED" },
  ]),
  ...makeSeedSet("CASE_CHAMPIONSHIP", [
    { title: "Кейс-чемпионат по публичной политике", organizer: "Вымышленная аналитическая мастерская", direction: "POLITICAL_SCIENCE", offset: 20 },
    { title: "Финансовый кейс-спринт", organizer: "Демо-консалтинговая лаборатория", direction: "ECONOMICS_FINANCE", offset: 33 },
    { title: "Хакатон устойчивых городов", organizer: "Центр городских инициатив", direction: "DATA_IT", offset: 13, status: "DRAFT" },
  ]),
  ...makeSeedSet("CONFERENCE", [
    { title: "Молодёжная конференция по международным отношениям", organizer: "Вымышленная научная школа", direction: "INTERNATIONAL_RELATIONS", offset: 23 },
    { title: "Конференция по цифровой экономике", organizer: "Демо-институт прикладной экономики", direction: "ECONOMICS_FINANCE", offset: 29 },
    { title: "Студенческая конференция по регионоведению", organizer: "Кафедра региональных исследований", direction: "REGIONAL_STUDIES", offset: 8 },
  ]),
  ...makeSeedSet("COMPETITION", [
    { title: "Конкурс эссе о международном сотрудничестве", organizer: "Вымышленный дискуссионный центр", direction: "INTERNATIONAL_RELATIONS", offset: 16 },
    { title: "Конкурс студенческих переводов", organizer: "Языковая лаборатория кампуса", direction: "LANGUAGES", offset: 26 },
    { title: "Конкурс сценариев публичной политики", organizer: "Демо-центр политических исследований", direction: "POLITICAL_SCIENCE", offset: 6, status: "ARCHIVED" },
  ]),
  ...makeSeedSet("INTERNSHIP", [
    { title: "Стажировка в исследовательской лаборатории", organizer: "Вымышленная лаборатория данных", direction: "DATA_IT", offset: 30 },
    { title: "Стажировка в редакции студенческого медиа", organizer: "Демо-медиацентр", direction: "JOURNALISM_MEDIA", offset: 12 },
    { title: "Стажировка в культурном проекте", organizer: "Вымышленный фонд культурных инициатив", direction: "HISTORY_CULTURE", offset: 19, status: "DRAFT" },
  ]),
  ...makeSeedSet("EXCHANGE", [
    { title: "Семестровая программа академического обмена", organizer: "Демо-офис международных программ", direction: "INTERNATIONAL_RELATIONS", offset: 42, format: "OFFLINE" },
    { title: "Летняя исследовательская школа за рубежом", organizer: "Вымышленный академический консорциум", direction: "REGIONAL_STUDIES", offset: 34, cost: "PAID", costNote: "Демо-стоимость участия" },
  ]),
  ...makeSeedSet("VOLUNTEERING", [
    { title: "Волонтёрская программа языкового обмена", organizer: "Вымышленное студенческое сообщество", direction: "LANGUAGES", offset: 9 },
    { title: "Экологические выходные кампуса", organizer: "Демо-центр социальных проектов", direction: "SOCIAL_PROJECTS", offset: 18 },
    { title: "Волонтёры студенческой конференции", organizer: "Оргкомитет демо-конференции", direction: "SOCIAL_PROJECTS", offset: 5 },
  ]),
];
