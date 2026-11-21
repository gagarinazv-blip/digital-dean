export type DemoStudentSeedAccount = {
  login: string;
  passwordVariable: string;
  phone: string;
  fullName: string;
  faculty: string;
  direction: string;
  groupName: string;
  course: number;
  recordBookNumber?: string;
  studyForm?: "FULL_TIME" | "PART_TIME" | "CORRESPONDENCE";
};

export const demoAcademicStudentCredentials = [
  {
    login: "student.alpha",
    passwordVariable: "SEED_ALPHA_PASSWORD",
    phone: "+79000000001",
    accountStatus: "ACTIVE",
  },
  {
    login: "student.beta",
    passwordVariable: "SEED_BETA_PASSWORD",
    phone: "+79000000002",
    accountStatus: "ACTIVE",
  },
] as const;

export const testSeedStudentAccounts = [
  {
    login: "test.seed.01",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001001",
    fullName: "Аэлитта Ветрова-Даль",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.02",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001002",
    fullName: "Яромир Листогоров",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.03",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001003",
    fullName: "Мирелла Камышова",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.04",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001004",
    fullName: "Терентий Облаков",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.05",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001005",
    fullName: "Лиора Звездолётова",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-03",
    course: 3,
  },
  {
    login: "test.seed.06",
    passwordVariable: "SEED_TEST_STUDENTS_PASSWORD",
    phone: "+79000001006",
    fullName: "Феликс Кленоветер",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-03",
    course: 3,
  },
] as const satisfies readonly DemoStudentSeedAccount[];

export const demoStaffAccounts = [
  {
    login: "staff.demo",
    passwordVariable: "SEED_STAFF_PASSWORD",
    phone: "+79000002001",
    fullName: "Мирослава Лунная",
    position: "специалист учебного отдела",
    department: "Учебный отдел",
    isSupervisor: false,
  },
  {
    login: "staff.other",
    passwordVariable: "SEED_STAFF_PASSWORD",
    phone: "+79000002002",
    fullName: "Тихон Северозвёздный",
    position: "специалист по работе со студентами",
    department: "Отдел по работе со студентами",
    isSupervisor: false,
  },
  {
    login: "staff.manager",
    passwordVariable: "SEED_STAFF_PASSWORD",
    phone: "+79000002003",
    fullName: "Лада Меридиан",
    position: "старший специалист учебного отдела",
    department: "Учебный отдел",
    isSupervisor: true,
  },
] as const;
