import { addDemoDays, getDemoNow } from "../src/lib/demo-date";

const deadlineFixtures = [
  {
    login: "student.alpha",
    subject: "Компьютерные сети",
    title: "Лабораторная работа № 3",
    daysFromDemoDate: 2,
    description: "Подготовить отчёт по настройке тестовой сети.",
  },
  {
    login: "student.alpha",
    subject: "Алгоритмы анализа данных",
    title: "Контрольная работа № 2",
    daysFromDemoDate: 0,
    description: "Решить задачи из вымышленного учебного набора.",
  },
  {
    login: "student.alpha",
    subject: "Проектирование баз данных",
    title: "Схема базы данных",
    daysFromDemoDate: 5,
    description: "Загрузить схему проекта и краткое описание.",
  },
  {
    login: "student.alpha",
    subject: "Проектирование интерфейсов",
    title: "Макет интерфейса",
    daysFromDemoDate: 8,
    description: "Подготовить прототип интерфейса учебного проекта.",
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
] as const;

export function buildDeadlineSeedData(now = getDemoNow()) {
  return deadlineFixtures.map((fixture) => ({
    ...fixture,
    dueAt: addDemoDays(fixture.daysFromDemoDate, now),
  }));
}
