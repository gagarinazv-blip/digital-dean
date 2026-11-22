import type {
  DeadlineFormat,
  DeadlineMaterialKind,
  DeadlineMaterialUploaderRole,
  DeadlineProgressStatus,
} from "../src/generated/prisma/enums";
import { getMoscowDateKey, getMoscowDateTime } from "../src/lib/campus-time";
import { addDemoDays, getDemoNow } from "../src/lib/demo-date";

export type DeadlineMaterialFixture = {
  title: string;
  kind: DeadlineMaterialKind;
  // Имя файла в prisma/demo-materials или внешняя ссылка.
  fileName?: string;
  url?: string;
  uploadedByName: string;
  uploadedByRole: DeadlineMaterialUploaderRole;
  uploadedByLogin?: string;
  uploadedDaysAgo: number;
};

export type DeadlineFixture = {
  login: "student.alpha" | "student.beta";
  subject: string;
  title: string;
  daysFromDemoDate: number;
  dueTime?: string;
  description: string | null;
  topic?: string;
  format?: DeadlineFormat;
  taskUrl?: string;
  location?: string;
  criteria?: readonly string[];
  materials?: readonly DeadlineMaterialFixture[];
  progress?: {
    status: DeadlineProgressStatus;
    doneSteps: number;
  };
};

const DEFAULT_DUE_TIME = "23:59";

const deadlineFixtures: readonly DeadlineFixture[] = [
  {
    login: "student.alpha",
    subject: "Компьютерные сети",
    title: "Лабораторная работа № 3",
    daysFromDemoDate: 2,
    description:
      "Подготовить отчёт по настройке тестовой сети: схема, таблица адресации, настройки маршрутизаторов и выводы.",
    topic: "Статическая маршрутизация в тестовой сети",
    format: "ONLINE",
    taskUrl: "https://example.com/demo-tasks/network-lab-3",
    criteria: [
      "Схема сети и таблица адресации — 30%",
      "Рабочая маршрутизация между подсетями — 40%",
      "Выводы и ответы на вопросы — 30%",
    ],
    materials: [
      {
        title: "Методичка к лабораторной работе № 3",
        kind: "PDF",
        fileName: "network-lab-guide.pdf",
        uploadedByName: "Ольга Павловна Зорина",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 6,
      },
      {
        title: "Онлайн-калькулятор подсетей",
        kind: "LINK",
        url: "https://example.com/demo-tools/subnet-calculator",
        uploadedByName: "Ольга Павловна Зорина",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 4,
      },
      {
        title: "Порядок оформления отчётов",
        kind: "LINK",
        url: "https://example.com/demo-rules/report-format",
        uploadedByName: "Мирослава Лунная",
        uploadedByRole: "STAFF",
        uploadedByLogin: "staff.demo",
        uploadedDaysAgo: 9,
      },
    ],
    progress: { status: "IN_PROGRESS", doneSteps: 2 },
  },
  {
    login: "student.alpha",
    subject: "Алгоритмы анализа данных",
    title: "Контрольная работа № 2",
    daysFromDemoDate: 0,
    description: "Решить задачи из вымышленного учебного набора.",
    topic: "Оценка сложности и деревья решений",
    format: "ONLINE",
    taskUrl: "https://example.com/demo-tasks/algorithms-test-2",
    criteria: ["Верное решение — 70%", "Обоснование сложности — 30%"],
    materials: [
      {
        title: "Типовые задачи",
        kind: "PDF",
        fileName: "algorithms-sample-tasks.pdf",
        uploadedByName: "Марина Олеговна Белозёрова",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 8,
      },
      {
        title: "Шпаргалка по оценке сложности",
        kind: "DOC",
        fileName: "algorithms-complexity-notes.docx",
        uploadedByName: "Марина Олеговна Белозёрова",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 3,
      },
    ],
  },
  {
    login: "student.alpha",
    subject: "Проектирование баз данных",
    title: "Схема базы данных",
    daysFromDemoDate: 5,
    description: "Загрузить схему проекта и краткое описание.",
    topic: "ER-модель и нормализация",
    format: "ONLINE",
    criteria: [
      "Полнота сущностей и связей",
      "Третья нормальная форма",
      "Понятное описание решений",
    ],
    materials: [
      {
        title: "Нормализация и ER-модель: слайды лекции",
        kind: "SLIDES",
        fileName: "database-normalization-slides.pdf",
        uploadedByName: "Наталья Андреевна Туманова",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 5,
      },
    ],
  },
  {
    login: "student.alpha",
    subject: "Проектирование интерфейсов",
    title: "Макет интерфейса",
    daysFromDemoDate: -1,
    dueTime: "18:00",
    description: "Подготовить прототип интерфейса учебного проекта.",
    topic: "Интерактивный прототип",
    format: "OFFLINE",
    location: "Корпус В, аудитория 012",
  },
  {
    login: "student.beta",
    subject: "Распределённые приложения",
    title: "Практическое задание № 2",
    daysFromDemoDate: -1,
    description: "Проверить взаимодействие тестовых сервисов.",
  },
  {
    login: "student.beta",
    subject: "Управление данными",
    title: "Запросы к учебной базе",
    daysFromDemoDate: 1,
    description: "Сдать набор запросов и краткие результаты.",
    topic: "Группировка и соединение таблиц",
    format: "ONLINE",
    taskUrl: "https://example.com/demo-tasks/data-queries",
    materials: [
      {
        title: "Описание учебной базы",
        kind: "PDF",
        fileName: "data-management-queries.pdf",
        uploadedByName: "Ирина Валерьевна Громова",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 2,
      },
    ],
  },
  {
    login: "student.beta",
    subject: "Визуальная аналитика",
    title: "Черновик визуализации",
    daysFromDemoDate: 4,
    description: "Подготовить черновой вариант отчёта.",
  },
  {
    login: "student.beta",
    subject: "Правовые основы цифровой среды",
    title: "Тест по учебному модулю",
    daysFromDemoDate: 7,
    description: "Пройти демонстрационный тест.",
  },
  {
    login: "student.alpha",
    subject: "Статистические методы",
    title: "Защита расчётной работы",
    daysFromDemoDate: 1,
    dueTime: "14:00",
    description: "Принести распечатанную работу и ответить на вопросы.",
    topic: "Доверительные интервалы и проверка гипотез",
    format: "OFFLINE",
    location: "Корпус Б, аудитория 108",
    criteria: ["Корректные расчёты — 60%", "Ответы на вопросы — 40%"],
    materials: [
      {
        title: "Требования к расчётной работе",
        kind: "PDF",
        fileName: "statistics-requirements.pdf",
        uploadedByName: "Андрей Михайлович Руднев",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 7,
      },
    ],
  },
  {
    login: "student.alpha",
    subject: "Экономика цифровых проектов",
    title: "Разбор учебного кейса",
    daysFromDemoDate: 7,
    description: null,
    topic: "Бизнес-модель цифрового сервиса",
    format: "ONLINE",
    taskUrl: "https://example.com/demo-tasks/economics-case",
  },
  {
    login: "student.alpha",
    subject: "Компьютерные сети",
    title: "Устная часть экзамена",
    daysFromDemoDate: 9,
    dueTime: "10:00",
    description: "Ответить на два вопроса из списка и решить задачу.",
    topic: "Адресация, маршрутизация и транспортные протоколы",
    format: "EXAM",
    location: "Корпус А, аудитория 214",
    criteria: ["Теоретические вопросы — 60%", "Задача — 40%"],
    materials: [
      {
        title: "Вопросы к устной части",
        kind: "PDF",
        fileName: "network-exam-questions.pdf",
        uploadedByName: "Ольга Павловна Зорина",
        uploadedByRole: "TEACHER",
        uploadedDaysAgo: 1,
      },
    ],
  },
  {
    login: "student.alpha",
    subject: "Курсовой проект по анализу требований",
    title: "Итоговый текст курсовой работы",
    daysFromDemoDate: 30,
    description: "Сдать итоговую версию текста с учётом замечаний.",
    topic: "Требования к учебной информационной системе",
    format: "ONLINE",
    taskUrl: "https://example.com/demo-tasks/coursework",
  },
];

function getDueAt(daysFromDemoDate: number, dueTime: string, now: Date): Date {
  const dateKey = getMoscowDateKey(addDemoDays(daysFromDemoDate, now));
  return getMoscowDateTime(
    new Date(`${dateKey}T00:00:00.000Z`),
    new Date(`1970-01-01T${dueTime}:00.000Z`),
  );
}

export function buildDeadlineSeedData(now = getDemoNow()) {
  return deadlineFixtures.map((fixture) => ({
    ...fixture,
    dueAt: getDueAt(
      fixture.daysFromDemoDate,
      fixture.dueTime ?? DEFAULT_DUE_TIME,
      now,
    ),
  }));
}

export function getDeadlineSeedSyncPlan(
  existing: readonly { id: string; status: "OPEN" | "SUBMITTED" }[],
) {
  const firstOpen = existing.find(({ status }) => status === "OPEN");
  return {
    deadlineId: firstOpen?.id ?? existing[0]?.id ?? null,
    openDeadlineIds: existing
      .filter(({ status }) => status === "OPEN")
      .map(({ id }) => id),
  };
}
