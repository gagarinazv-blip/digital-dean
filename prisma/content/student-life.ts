import type { Prisma } from "../../src/generated/prisma/client";
import type {
  DeadlineFormat,
  DeadlineProgressStatus,
  DeadlineStatus,
  OpportunityApplicationKind,
  OpportunityApplicationStatus,
  PortfolioCategory,
  PortfolioSource,
  StudentDocumentType,
} from "../../src/generated/prisma/enums";

export type ApplicationContent = {
  login: string;
  opportunity: string;
  status: OpportunityApplicationStatus;
  kind?: OpportunityApplicationKind;
  submittedDaysAgo: number;
  motivation: string;
  details?: Prisma.InputJsonObject;
  lateReason?: string;
  staffComment?: string;
};

/** Заявки на участие: у каждого из студентов свой набор статусов. */
export const applicationContent: readonly ApplicationContent[] = [
  { login: "student.alpha", opportunity: "Клуб наблюдателей неба", status: "SUBMITTED", submittedDaysAgo: 1, motivation: "С детства веду дневник погоды и хочу научиться смотреть выше облаков. Готова дежурить у телескопа по четвергам." },
  { login: "student.alpha", opportunity: "Хакатон «Ночь открытых лабораторий»", status: "IN_REVIEW", submittedDaysAgo: 3, motivation: "Мы уже собирали карту шума для курсовой и хотим продолжить с данными обсерватории.", details: { teamName: "Третья орбита", teamMembers: "Елизавета Воронцова — ИС-21\nДаниил Климов — ИС-22" }, staffComment: "Заявка у экспертов, ответ придёт в течение трёх дней." },
  { login: "student.alpha", opportunity: "Камерный хор «Полутон»", status: "NEEDS_INFO", submittedDaysAgo: 5, motivation: "Пела в школьном хоре шесть лет, партия второго альта.", details: { experience: "Сольфеджио, чтение с листа.", auditionTime: "Среда, 17:30" }, staffComment: "Уточните, пожалуйста, сможете ли вы приходить на репетиции по вторникам." },
  { login: "student.alpha", opportunity: "Наставники для первокурсников", status: "ACCEPTED", submittedDaysAgo: 12, motivation: "Помню, как искала аудиторию сорок минут в первый день. Хочу, чтобы кому-то было проще.", details: { availability: "Понедельник и суббота" }, staffComment: "Ждём вас на тренинге в субботу в 12:00, «Верстак»." },
  { login: "student.alpha", opportunity: "Плакат для тихой улицы", status: "REJECTED", submittedDaysAgo: 24, motivation: "Плакат «Шёпот — тоже голос».", details: { nomination: "Шрифт" }, staffComment: "Работа вошла в длинный список. Жюри отметило композицию и советует доработать контраст." },
  { login: "student.alpha", opportunity: "Семестр в университете Алта-Марэ", status: "WITHDRAWN", submittedDaysAgo: 9, motivation: "Хотела сравнить, как работают с открытыми данными в портовых городах.", details: { desiredProgram: "INTERNATIONAL_RELATIONS" } },
  { login: "student.alpha", opportunity: "Плавание: дополнительный набор", status: "IN_REVIEW", kind: "LATE_REQUEST", submittedDaysAgo: 1, motivation: "Плаваю самостоятельно дважды в неделю, хочу тренироваться с группой.", details: { trainingLevel: "intermediate" }, lateReason: "Во время основного набора проходила практику в другом городе.", staffComment: "Тренер посмотрит результаты контрольного заплыва." },
  { login: "student.beta", opportunity: "Стажировка аналитика городских данных", status: "IN_REVIEW", submittedDaysAgo: 4, motivation: "Интересны пешеходные потоки: в курсовой сравнивал входы в кампус по часам.", details: { preferredTiming: "С января" }, staffComment: "Передали резюме в бюро." },
  { login: "student.beta", opportunity: "Секция скалолазания", status: "ACCEPTED", submittedDaysAgo: 14, motivation: "Готов к вводному модулю.", details: { trainingLevel: "beginner" }, staffComment: "Первое занятие в понедельник в 19:00." },
  { login: "student.beta", opportunity: "Конкурс коротких эссе «Окно напротив»", status: "SUBMITTED", submittedDaysAgo: 2, motivation: "Эссе о соседе, который поливает цветы в дождь.", details: { nomination: "Репортаж" } },
  { login: "student.beta", opportunity: "Микрогранты на студенческие проекты", status: "NEEDS_INFO", submittedDaysAgo: 6, motivation: "Полка для обмена зарядками и книгами на этаже.", details: { researchTopic: "Инфраструктура взаимопомощи в общежитии" }, staffComment: "Добавьте в смету стоимость крепления и срок монтажа." },
];

/** Что студенты сохранили в избранное. */
export const bookmarkContent: Readonly<Record<string, readonly string[]>> = {
  "student.alpha": [
    "Цифровой двойник: от здания к кварталу",
    "Исследовательский грант «Первые сто страниц»",
    "Мастерская плёночной фотографии",
    "Онлайн-обмен «Две аудитории»",
    "Беговой клуб «Первый круг»",
  ],
  "student.beta": [
    "Олимпиада по прикладной математике «Параллель»",
    "Дипломатическая симуляция «Пролив»",
    "Клуб настольных игр «Шестигранник»",
  ],
};

export type AchievementContent = {
  login: string;
  folder: string | null;
  title: string;
  category: PortfolioCategory;
  eventName: string;
  daysAgo: number;
  role: string;
  description: string;
  source: PortfolioSource;
  /** Файл в prisma/content/files. */
  file: string;
  fileTitle: string;
};

export const achievementContent: readonly AchievementContent[] = [
  // Елизавета Воронцова
  { login: "student.alpha", folder: "Наука", title: "Карта шума кампуса: доклад и постер", category: "SCIENCE", eventName: "Конференция «Открытые данные для маленьких городов»", daysAgo: 3, role: "Докладчик", description: "Сорок точек замера, три времени суток и вывод о самой тихой скамейке во Дворе Аркад.", source: "STUDENT", file: "sky-map.pdf", fileTitle: "Сертификат докладчика" },
  { login: "student.alpha", folder: "Наука", title: "Лучшая первая работа секции «Интерфейсы»", category: "SCIENCE", eventName: "Чтения «Первый черновик»", daysAgo: 196, role: "Лауреат", description: "Исследование о том, как незнакомые значки замедляют чтение карты.", source: "STAFF", file: "first-draft.pdf", fileTitle: "Диплом лауреата" },
  { login: "student.alpha", folder: "Проекты и конкурсы", title: "Второе место в олимпиаде «Параллель»", category: "COMPETITION", eventName: "Олимпиада по прикладной математике «Параллель»", daysAgo: 231, role: "Призёр", description: "Решение задачи о расписании автобусов без пересекающихся смен водителей.", source: "STAFF", file: "parallel.pdf", fileTitle: "Диплом второй степени" },
  { login: "student.alpha", folder: "Проекты и конкурсы", title: "Приз зрителей хакатона «Сутки на крыше»", category: "COMPETITION", eventName: "Хакатон обсерватории «Кольцо»", daysAgo: 118, role: "Дизайнер команды «Третья орбита»", description: "Прототип уведомлений о ясном небе: сервис будит только тогда, когда это того стоит.", source: "STUDENT", file: "rooftop.pdf", fileTitle: "Диплом команды" },
  { login: "student.alpha", folder: "Волонтёрство", title: "Тридцать часов в аудиобиблиотеке", category: "VOLUNTEERING", eventName: "Проект «Голоса для библиотеки»", daysAgo: 63, role: "Диктор", description: "Две главы учебника по статистике и один сборник рассказов.", source: "STAFF", file: "voices.pdf", fileTitle: "Благодарность" },
  { login: "student.alpha", folder: "Волонтёрство", title: "Навигация на Ночи открытых лабораторий", category: "VOLUNTEERING", eventName: "Ночь открытых лабораторий", daysAgo: 37, role: "Координатор маршрута", description: "Маршрут для двухсот гостей и ни одного потерянного.", source: "STUDENT", file: "night.pdf", fileTitle: "Сертификат волонтёра" },
  { login: "student.alpha", folder: "Спорт", title: "Финишёр забега «Первый круг», 10 км", category: "SPORT", eventName: "Осенний забег кампуса", daysAgo: 51, role: "Участник", description: "56 минут 12 секунд, личный рекорд.", source: "STUDENT", file: "first-lap.pdf", fileTitle: "Диплом финишёра" },
  { login: "student.alpha", folder: "Творчество", title: "Серия плёночных фотографий «Метр стены»", category: "CREATIVITY", eventName: "Выставка мастерской «Засветка»", daysAgo: 82, role: "Автор", description: "Семь кадров о лестницах, по которым никто не ходит.", source: "STUDENT", file: "one-metre.pdf", fileTitle: "Каталог выставки" },
  { login: "student.alpha", folder: "Творчество", title: "Вторая партия альтов в программе «Звуки города»", category: "CREATIVITY", eventName: "Концерт хора «Полутон»", daysAgo: 160, role: "Участник хора", description: "Обработка сигналов трамвая для четырёх голосов.", source: "STAFF", file: "halftone.pdf", fileTitle: "Программа концерта" },
  { login: "student.alpha", folder: null, title: "Курс «Бережное общение»", category: "OTHER", eventName: "Волонтёрский центр «Рядом»", daysAgo: 9, role: "Слушатель", description: "Двенадцать часов практики: вопросы, границы и умение молчать.", source: "STAFF", file: "gentle-talk.pdf", fileTitle: "Сертификат об обучении" },

  // Даниил Климов
  { login: "student.beta", folder: "Исследования", title: "Пешеходные потоки у трёх входов", category: "SCIENCE", eventName: "Чтения «Первый черновик»", daysAgo: 196, role: "Докладчик", description: "Модель, которая предсказывает очередь в гардероб за пятнадцать минут.", source: "STUDENT", file: "footsteps.pdf", fileTitle: "Сертификат докладчика" },
  { login: "student.beta", folder: "Исследования", title: "Финалист кейс-чемпионата «Бюджет одного квартала»", category: "COMPETITION", eventName: "Клуб финансовых решений", daysAgo: 145, role: "Аналитик", description: "Сквер вместо парковки и честный расчёт, кто за это заплатит.", source: "STAFF", file: "quarter.pdf", fileTitle: "Диплом финалиста" },
  { login: "student.beta", folder: null, title: "Вводный модуль по скалолазанию", category: "SPORT", eventName: "Спортивный корпус «Вертикаль»", daysAgo: 11, role: "Спортсмен", description: "Допуск к самостоятельному лазанию с нижней страховкой.", source: "STAFF", file: "vertical.pdf", fileTitle: "Свидетельство о допуске" },
  { login: "student.beta", folder: null, title: "Субботник и посадка сорока кустов", category: "VOLUNTEERING", eventName: "Ботанический двор", daysAgo: 70, role: "Волонтёр", description: "Шесть часов, лопата и новая аллея у оранжереи.", source: "STUDENT", file: "garden.pdf", fileTitle: "Благодарность" },
  { login: "student.beta", folder: null, title: "Звук к спектаклю «Двенадцать минут»", category: "CREATIVITY", eventName: "Театральная лаборатория «Пауза»", daysAgo: 33, role: "Звукорежиссёр", description: "Партитура из шагов, дверей и чайника.", source: "STUDENT", file: "pause.pdf", fileTitle: "Программа спектакля" },
  { login: "student.beta", folder: null, title: "Первая помощь: базовый уровень", category: "OTHER", eventName: "Студенческий спортивный совет", daysAgo: 92, role: "Слушатель", description: "Практический курс и зачёт на манекене.", source: "STAFF", file: "first-aid.pdf", fileTitle: "Сертификат об обучении" },
];

export type DocumentContent = {
  login: string;
  title: string;
  documentType: StudentDocumentType;
  file: string;
  fileTitle: string;
};

export const documentContent: readonly DocumentContent[] = [
  { login: "student.alpha", title: "Договор об обучении", documentType: "CONTRACT", file: "contract.pdf", fileTitle: "Договор об обучении" },
  { login: "student.alpha", title: "Справка для стажировки", documentType: "REFERENCE", file: "reference.pdf", fileTitle: "Справка для стажировки" },
  { login: "student.alpha", title: "Правила тренировок в «Вертикали»", documentType: "OTHER", file: "training-rules.pdf", fileTitle: "Правила тренировок" },
  { login: "student.alpha", title: "Индивидуальный учебный план", documentType: "OTHER", file: "study-plan.pdf", fileTitle: "Индивидуальный план" },
];

export type DeadlineContent = {
  login: string;
  disciplineId: string;
  subject: string;
  title: string;
  topic: string;
  description: string;
  format: DeadlineFormat;
  status: DeadlineStatus;
  inDays: number;
  time: string;
  location?: string;
  criteria: readonly string[];
  progress: { status: DeadlineProgressStatus; doneSteps: number };
};

export const deadlineContent: readonly DeadlineContent[] = [
  { login: "student.alpha", disciplineId: "pi31-s5-networks", subject: "Компьютерные сети", title: "Контрольная работа № 1", topic: "Канальный и сетевой уровни", description: "Две задачи на адресацию и одна на поиск ошибки в конфигурации.", format: "OFFLINE", status: "SUBMITTED", inDays: -31, time: "12:00", location: "МО-101, ауд. 305", criteria: ["Адресация — 60%", "Поиск ошибки — 40%"], progress: { status: "DONE", doneSteps: 5 } },
  { login: "student.alpha", disciplineId: "pi31-s5-networks", subject: "Компьютерные сети", title: "Лабораторная работа № 2", topic: "Виртуальные сети отделов", description: "Развести трафик трёх отделов и показать, что чужие принтеры больше не видны.", format: "ONLINE", status: "SUBMITTED", inDays: -13, time: "23:59", criteria: ["Схема — 30%", "Настройка — 50%", "Отчёт — 20%"], progress: { status: "DONE", doneSteps: 5 } },
  { login: "student.alpha", disciplineId: "pi31-s5-ux", subject: "Проектирование интерфейсов", title: "Юзабилити-тест вывески", topic: "Навигация в незнакомом здании", description: "Проведите пять коротких наблюдений в корпусе Б и опишите, где люди останавливаются и оглядываются.", format: "ONLINE", status: "OPEN", inDays: 6, time: "20:00", criteria: ["Методика — 30%", "Наблюдения — 40%", "Выводы — 30%"], progress: { status: "IN_PROGRESS", doneSteps: 1 } },
  { login: "student.alpha", disciplineId: "pi31-s5-databases", subject: "Проектирование баз данных", title: "Контрольная работа", topic: "Индексы и планы запросов", description: "Объясните, почему один и тот же запрос выполняется за секунду и за минуту.", format: "OFFLINE", status: "OPEN", inDays: 11, time: "10:15", location: "МО-101, ауд. 203", criteria: ["Анализ плана — 50%", "Предложенный индекс — 50%"], progress: { status: "NOT_STARTED", doneSteps: 0 } },
  { login: "student.alpha", disciplineId: "pi31-s5-statistics", subject: "Статистические методы", title: "Проверка городской легенды", topic: "Критерии согласия", description: "Выберите любое народное наблюдение — например, что по пятницам автобусы ходят реже — и проверьте его на данных.", format: "ONLINE", status: "OPEN", inDays: 17, time: "23:59", criteria: ["Постановка гипотезы — 30%", "Расчёты — 50%", "Вывод — 20%"], progress: { status: "NOT_STARTED", doneSteps: 0 } },
  { login: "student.alpha", disciplineId: "pi31-s5-algorithms", subject: "Алгоритмы анализа данных", title: "Экзамен по алгоритмам", topic: "Билеты 1–40", description: "Устный ответ и короткая задача у доски.", format: "EXAM", status: "OPEN", inDays: 30, time: "09:00", location: "Корпус А, аудитория 214", criteria: ["Теория — 50%", "Задача — 50%"], progress: { status: "NOT_STARTED", doneSteps: 0 } },
  { login: "student.beta", disciplineId: "pi31-s5-distributed", subject: "Распределённые приложения", title: "Лабораторная работа № 2", topic: "Очереди сообщений", description: "Сервис доставки записок между корпусами, который не теряет их при перезапуске.", format: "ONLINE", status: "OPEN", inDays: 5, time: "23:59", criteria: ["Надёжность — 60%", "Описание — 40%"], progress: { status: "IN_PROGRESS", doneSteps: 3 } },
  { login: "student.beta", disciplineId: "pi31-s5-law", subject: "Правовые основы цифровой среды", title: "Разбор спора о вывеске", topic: "Авторское право на шрифт", description: "Подготовьте позицию одной из сторон на две страницы.", format: "OFFLINE", status: "OPEN", inDays: 12, time: "14:30", location: "МО-101, ауд. 402", criteria: ["Аргументы — 70%", "Источники — 30%"], progress: { status: "NOT_STARTED", doneSteps: 0 } },
  { login: "student.beta", disciplineId: "pi31-s5-distributed", subject: "Распределённые приложения", title: "Контрольная работа № 1", topic: "Согласованность и задержки", description: "Три коротких вопроса и схема.", format: "OFFLINE", status: "SUBMITTED", inDays: -18, time: "12:00", location: "МО-101, ауд. 305", criteria: ["Вопросы — 60%", "Схема — 40%"], progress: { status: "DONE", doneSteps: 5 } },
];

export type AnnouncementContent = { title: string; text: string; hoursAgo: number; isRead: boolean };

export const announcementContent: readonly AnnouncementContent[] = [
  { title: "Сезон «Невидимый город»: программа на неделю", text: "Лекция о переводчиках, мастер-класс по голосу и лингвистическая конференция. Полное расписание — в дайджесте.", hoursAgo: 5, isRead: false },
  { title: "Читальный зал «Периптер» работает до полуночи", text: "С понедельника и до конца сессии зал открыт с 08:00 до 00:00, вход по пропуску.", hoursAgo: 29, isRead: false },
  { title: "Изменён порядок записи в «Вертикаль»", text: "Справку о допуске теперь можно загрузить в раздел «Мои документы» и прикреплять к заявкам.", hoursAgo: 76, isRead: true },
];
