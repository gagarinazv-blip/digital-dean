export type AcademicControlType =
  | "EXAM"
  | "CREDIT"
  | "DIFFERENTIATED_CREDIT"
  | "COURSEWORK";

export type AcademicAttempt = {
  attempt: number;
  date: string;
  value: string;
};

export type AcademicResult = {
  subjectId: string;
  status: "PASSED" | "ACADEMIC_DEBT";
  value: string;
  date: string;
  attemptCount: number;
  attempts: AcademicAttempt[];
};

export type AcademicSubject = {
  id: string;
  name: string;
  department: string;
  teacher: string;
  hours: number;
  credits: number;
  controlType: AcademicControlType;
};

export type AcademicSemester = {
  id: string;
  number: number;
  name: string;
  isCurrent: boolean;
  subjects: AcademicSubject[];
  results: AcademicResult[];
};

export type AcademicSessionItem = {
  semesterId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  controlType: AcademicControlType;
  status: "COMPLETED" | "PLANNED";
};

export type AcademicStudent = {
  login: string;
  fullName: string;
  faculty: string;
  recordBookNumber: string;
  group: string;
  course: number;
  direction: string;
  studyForm: "очная" | "очно-заочная" | "заочная";
  semesters: AcademicSemester[];
  currentSemesterSchedule: AcademicSessionItem[];
};

export const academicRecordsSeedData: {
  datasetId: string;
  snapshotDate: string;
  academicYear: string;
  students: AcademicStudent[];
} = {
  datasetId: "academic-records-demo",
  snapshotDate: "2026-11-15",
  academicYear: "2026/2027",
  students: [
    {
      login: "student.alpha",
      fullName: "Елизавета Воронцова",
      faculty: "Факультет прикладных вычислений",
      recordBookNumber: "ЗК-26-031",
      group: "TEST-ACADEMIC-31A",
      course: 3,
      direction: "Прикладная информатика",
      studyForm: "очная",
      semesters: [
        {
          id: "2026-2027-1",
          number: 5,
          name: "Осенний",
          isCurrent: true,
          subjects: [
            {
              id: "pi31-s5-algorithms",
              name: "Алгоритмы анализа данных",
              department: "Кафедра прикладных вычислений",
              teacher: "Марина Олеговна Белозёрова",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s5-economics",
              name: "Экономика цифровых проектов",
              department: "Кафедра цифровой экономики",
              teacher: "Илья Сергеевич Мельников",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s5-databases",
              name: "Проектирование баз данных",
              department: "Кафедра информационных систем",
              teacher: "Наталья Андреевна Туманова",
              hours: 144,
              credits: 4,
              controlType: "DIFFERENTIATED_CREDIT",
            },
            {
              id: "pi31-s5-coursework",
              name: "Курсовой проект по анализу требований",
              department: "Кафедра программной инженерии",
              teacher: "Роман Викторович Ладожин",
              hours: 54,
              credits: 2,
              controlType: "COURSEWORK",
            },
            {
              id: "pi31-s5-networks",
              name: "Компьютерные сети",
              department: "Кафедра вычислительных систем",
              teacher: "Ольга Павловна Зорина",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s5-statistics",
              name: "Статистические методы",
              department: "Кафедра математического моделирования",
              teacher: "Андрей Михайлович Руднев",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s5-ux",
              name: "Проектирование интерфейсов",
              department: "Кафедра информационных систем",
              teacher: "Светлана Игоревна Лескова",
              hours: 108,
              credits: 3,
              controlType: "DIFFERENTIATED_CREDIT",
            },
          ],
          results: [
            {
              subjectId: "pi31-s5-algorithms",
              status: "PASSED",
              value: "5",
              date: "2026-11-09",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-09", value: "5" }],
            },
            {
              subjectId: "pi31-s5-economics",
              status: "PASSED",
              value: "Зачтено",
              date: "2026-11-10",
              attemptCount: 1,
              attempts: [
                { attempt: 1, date: "2026-11-10", value: "Зачтено" },
              ],
            },
            {
              subjectId: "pi31-s5-databases",
              status: "PASSED",
              value: "5",
              date: "2026-11-11",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-11", value: "5" }],
            },
            {
              subjectId: "pi31-s5-coursework",
              status: "PASSED",
              value: "5",
              date: "2026-11-12",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-12", value: "5" }],
            },
          ],
        },
        {
          id: "2026-2027-2",
          number: 6,
          name: "Весенний",
          isCurrent: false,
          subjects: [
            {
              id: "pi31-s6-architecture",
              name: "Архитектура информационных систем",
              department: "Кафедра информационных систем",
              teacher: "Валерия Дмитриевна Светлова",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s6-machine-learning",
              name: "Введение в машинное обучение",
              department: "Кафедра прикладных вычислений",
              teacher: "Константин Львович Неверов",
              hours: 144,
              credits: 4,
              controlType: "EXAM",
            },
            {
              id: "pi31-s6-security",
              name: "Основы защиты информации",
              department: "Кафедра вычислительных систем",
              teacher: "Дарья Николаевна Белова",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s6-project",
              name: "Командная разработка программных систем",
              department: "Кафедра программной инженерии",
              teacher: "Павел Аркадьевич Журавлёв",
              hours: 108,
              credits: 3,
              controlType: "COURSEWORK",
            },
            {
              id: "pi31-s6-optimization",
              name: "Методы оптимизации",
              department: "Кафедра математического моделирования",
              teacher: "Екатерина Романовна Соколова",
              hours: 108,
              credits: 3,
              controlType: "DIFFERENTIATED_CREDIT",
            },
            {
              id: "pi31-s6-product",
              name: "Управление цифровым продуктом",
              department: "Кафедра цифровой экономики",
              teacher: "Михаил Евгеньевич Дорохов",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s6-testing",
              name: "Тестирование программного обеспечения",
              department: "Кафедра программной инженерии",
              teacher: "Алина Борисовна Ясенева",
              hours: 108,
              credits: 3,
              controlType: "DIFFERENTIATED_CREDIT",
            },
          ],
          results: [],
        },
      ],
      currentSemesterSchedule: [
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-algorithms",
          date: "2026-11-09",
          startTime: "09:00",
          endTime: "11:00",
          room: "Корпус А, аудитория 214",
          controlType: "EXAM",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-economics",
          date: "2026-11-10",
          startTime: "10:00",
          endTime: "11:30",
          room: "Корпус Б, аудитория 108",
          controlType: "CREDIT",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-databases",
          date: "2026-11-11",
          startTime: "13:00",
          endTime: "15:00",
          room: "Корпус А, аудитория 307",
          controlType: "DIFFERENTIATED_CREDIT",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-coursework",
          date: "2026-11-12",
          startTime: "09:30",
          endTime: "11:00",
          room: "Корпус В, аудитория 012",
          controlType: "COURSEWORK",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-networks",
          date: "2026-11-16",
          startTime: "09:00",
          endTime: "11:00",
          room: "Корпус А, аудитория 214",
          controlType: "EXAM",
          status: "PLANNED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-statistics",
          date: "2026-11-17",
          startTime: "10:00",
          endTime: "11:30",
          room: "Корпус Б, аудитория 108",
          controlType: "CREDIT",
          status: "PLANNED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-ux",
          date: "2026-11-18",
          startTime: "13:00",
          endTime: "15:00",
          room: "Корпус В, аудитория 012",
          controlType: "DIFFERENTIATED_CREDIT",
          status: "PLANNED",
        },
      ],
    },
    {
      login: "student.beta",
      fullName: "Даниил Климов",
      faculty: "Факультет прикладных вычислений",
      recordBookNumber: "ЗК-26-047",
      group: "TEST-ACADEMIC-31B",
      course: 3,
      direction: "Прикладная информатика",
      studyForm: "очная",
      semesters: [
        {
          id: "2026-2027-1",
          number: 5,
          name: "Осенний",
          isCurrent: true,
          subjects: [
            {
              id: "pi31-s5-discrete-math",
              name: "Дискретные модели вычислений",
              department: "Кафедра математического моделирования",
              teacher: "Леонид Петрович Арсеньев",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s5-data-management",
              name: "Управление данными",
              department: "Кафедра информационных систем",
              teacher: "Ирина Валерьевна Громова",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s5-modeling",
              name: "Моделирование бизнес-процессов",
              department: "Кафедра цифровой экономики",
              teacher: "Вадим Алексеевич Рябинин",
              hours: 108,
              credits: 3,
              controlType: "DIFFERENTIATED_CREDIT",
            },
            {
              id: "pi31-s5-course-design",
              name: "Курсовой проект по проектированию систем",
              department: "Кафедра программной инженерии",
              teacher: "Татьяна Сергеевна Миронова",
              hours: 54,
              credits: 2,
              controlType: "COURSEWORK",
            },
            {
              id: "pi31-s5-distributed",
              name: "Распределённые приложения",
              department: "Кафедра вычислительных систем",
              teacher: "Григорий Олегович Чесноков",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s5-analytics",
              name: "Визуальная аналитика",
              department: "Кафедра прикладных вычислений",
              teacher: "Нина Эдуардовна Ветрова",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s5-law",
              name: "Правовые основы цифровой среды",
              department: "Кафедра цифровой экономики",
              teacher: "Арсений Юрьевич Котов",
              hours: 72,
              credits: 2,
              controlType: "DIFFERENTIATED_CREDIT",
            },
          ],
          results: [
            {
              subjectId: "pi31-s5-discrete-math",
              status: "PASSED",
              value: "3",
              date: "2026-11-09",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-09", value: "3" }],
            },
            {
              subjectId: "pi31-s5-data-management",
              status: "PASSED",
              value: "Зачтено",
              date: "2026-11-13",
              attemptCount: 2,
              attempts: [
                { attempt: 1, date: "2026-11-10", value: "Не зачтено" },
                { attempt: 2, date: "2026-11-13", value: "Зачтено" },
              ],
            },
            {
              subjectId: "pi31-s5-modeling",
              status: "ACADEMIC_DEBT",
              value: "2",
              date: "2026-11-11",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-11", value: "2" }],
            },
            {
              subjectId: "pi31-s5-course-design",
              status: "PASSED",
              value: "4",
              date: "2026-11-12",
              attemptCount: 1,
              attempts: [{ attempt: 1, date: "2026-11-12", value: "4" }],
            },
          ],
        },
        {
          id: "2026-2027-2",
          number: 6,
          name: "Весенний",
          isCurrent: false,
          subjects: [
            {
              id: "pi31-s6-cloud",
              name: "Облачные вычислительные платформы",
              department: "Кафедра вычислительных систем",
              teacher: "Кира Анатольевна Озерова",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s6-data-warehouse",
              name: "Хранилища и потоки данных",
              department: "Кафедра информационных систем",
              teacher: "Станислав Романович Мартынов",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
            {
              id: "pi31-s6-ml-practice",
              name: "Практикум по машинному обучению",
              department: "Кафедра прикладных вычислений",
              teacher: "Элина Максимовна Савельева",
              hours: 108,
              credits: 3,
              controlType: "DIFFERENTIATED_CREDIT",
            },
            {
              id: "pi31-s6-research",
              name: "Методология прикладных исследований",
              department: "Кафедра математического моделирования",
              teacher: "Виктория Львовна Галкина",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s6-product-lab",
              name: "Лаборатория цифровых продуктов",
              department: "Кафедра цифровой экономики",
              teacher: "Денис Аркадьевич Михайлов",
              hours: 108,
              credits: 3,
              controlType: "COURSEWORK",
            },
            {
              id: "pi31-s6-quality",
              name: "Обеспечение качества ПО",
              department: "Кафедра программной инженерии",
              teacher: "Полина Олеговна Егорова",
              hours: 72,
              credits: 2,
              controlType: "CREDIT",
            },
            {
              id: "pi31-s6-decision",
              name: "Поддержка принятия решений",
              department: "Кафедра прикладных вычислений",
              teacher: "Алексей Витальевич Гущин",
              hours: 108,
              credits: 3,
              controlType: "EXAM",
            },
          ],
          results: [],
        },
      ],
      currentSemesterSchedule: [
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-discrete-math",
          date: "2026-11-09",
          startTime: "09:00",
          endTime: "11:00",
          room: "Корпус Г, аудитория 204",
          controlType: "EXAM",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-data-management",
          date: "2026-11-10",
          startTime: "10:00",
          endTime: "11:30",
          room: "Корпус В, аудитория 116",
          controlType: "CREDIT",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-modeling",
          date: "2026-11-11",
          startTime: "13:00",
          endTime: "15:00",
          room: "Корпус Г, аудитория 204",
          controlType: "DIFFERENTIATED_CREDIT",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-course-design",
          date: "2026-11-12",
          startTime: "09:30",
          endTime: "11:00",
          room: "Корпус В, аудитория 116",
          controlType: "COURSEWORK",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-data-management",
          date: "2026-11-13",
          startTime: "13:00",
          endTime: "14:30",
          room: "Корпус В, аудитория 118",
          controlType: "CREDIT",
          status: "COMPLETED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-distributed",
          date: "2026-11-16",
          startTime: "09:00",
          endTime: "11:00",
          room: "Корпус Г, аудитория 204",
          controlType: "EXAM",
          status: "PLANNED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-analytics",
          date: "2026-11-17",
          startTime: "10:00",
          endTime: "11:30",
          room: "Корпус В, аудитория 116",
          controlType: "CREDIT",
          status: "PLANNED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-law",
          date: "2026-11-18",
          startTime: "13:00",
          endTime: "15:00",
          room: "Корпус Г, аудитория 204",
          controlType: "DIFFERENTIATED_CREDIT",
          status: "PLANNED",
        },
        {
          semesterId: "2026-2027-1",
          subjectId: "pi31-s5-modeling",
          date: "2026-11-19",
          startTime: "09:00",
          endTime: "11:00",
          room: "Корпус Г, аудитория 208",
          controlType: "DIFFERENTIATED_CREDIT",
          status: "PLANNED",
        },
      ],
    },
  ],
};
