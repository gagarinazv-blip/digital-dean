import type { Prisma } from "../src/generated/prisma/client";
import type { CertificateFormStatus } from "../src/generated/prisma/enums";
import {
  normalizeCertificateTitle,
  type CertificateFormInput,
} from "../src/lib/certificate-form-validation";

export type CertificateSeedForm = CertificateFormInput & {
  code: string;
  status: CertificateFormStatus;
  sortOrder: number;
};

// Вымышленные виды справок для демонстрации конструктора.
export const certificateSeedForms: readonly CertificateSeedForm[] = [
  {
    code: "DEMO_DORMITORY_CERTIFICATE",
    title: "Справка для общежития",
    description:
      "Подтверждает обучение для заселения или продления проживания в общежитии.",
    executionDays: 3,
    deliveryMethods: ["ELECTRONIC", "DEAN_OFFICE"],
    requiresApproval: false,
    template:
      "Справка дана в том, что {{ФИО}} обучается в группе {{группа}}.\nВыдана для предоставления в общежитие.\nДата: {{дата}}",
    fields: [
      {
        id: "dormitory",
        label: "Корпус общежития",
        kind: "select",
        required: true,
        options: [
          { value: "OPTION_1", label: "Корпус «Север»" },
          { value: "OPTION_2", label: "Корпус «Юг»" },
        ],
      },
      { id: "moveIn", label: "Дата заселения", kind: "date", required: true },
      {
        id: "months",
        label: "Срок проживания, месяцев",
        kind: "number",
        required: true,
        min: 1,
        max: 12,
      },
      {
        id: "rules",
        label: "Ознакомлен(а) с правилами проживания",
        kind: "checkbox",
        required: true,
      },
    ],
    status: "ACTIVE",
    sortOrder: 30,
  },
  {
    code: "DEMO_SCHOLARSHIP_CERTIFICATE",
    title: "Справка о размере стипендии",
    description: "Сведения о начисленной стипендии за выбранный период.",
    executionDays: 5,
    deliveryMethods: ["ELECTRONIC"],
    requiresApproval: true,
    template:
      "{{ФИО}}, группа {{группа}}.\nСведения о стипендии предоставлены по состоянию на {{дата}}.",
    fields: [
      { id: "periodStart", label: "Начало периода", kind: "date", required: true },
      { id: "periodEnd", label: "Окончание периода", kind: "date", required: true },
      {
        id: "recipient",
        label: "Куда предоставляется",
        hint: "Например: отдел социальной поддержки.",
        kind: "text",
        required: true,
        maxLength: 200,
      },
    ],
    status: "ACTIVE",
    sortOrder: 40,
  },
  {
    code: "DEMO_ATTENDANCE_STATEMENT",
    title: "Выписка о посещаемости",
    description: "Черновик: выписка о посещении занятий за семестр.",
    executionDays: 7,
    deliveryMethods: ["DEAN_OFFICE"],
    requiresApproval: true,
    template: "",
    fields: [
      { id: "reason", label: "Причина запроса", kind: "text", required: true },
      {
        id: "supporting",
        label: "Подтверждающий документ",
        kind: "file",
        required: false,
      },
    ],
    status: "DRAFT",
    sortOrder: 50,
  },
];

// Повторный запуск не создаёт дублей и не перезаписывает правки сотрудника.
export async function syncCertificateSeed(
  tx: Prisma.TransactionClient,
): Promise<number> {
  let created = 0;
  for (const { code, status, sortOrder, ...form } of certificateSeedForms) {
    const normalizedTitle = normalizeCertificateTitle(form.title);
    const existing = await tx.certificateForm.findFirst({
      where: { OR: [{ code }, { normalizedTitle }] },
      select: { id: true },
    });
    if (existing) continue;
    await tx.certificateForm.create({
      data: {
        ...form,
        fields: form.fields,
        code,
        normalizedTitle,
        status,
        active: status === "ACTIVE",
        sortOrder,
        auditLogs: { create: { action: "CREATED", version: 1 } },
      },
    });
    created += 1;
  }
  return created;
}
