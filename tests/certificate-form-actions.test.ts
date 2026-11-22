import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertSameSiteRequest: vi.fn(),
  forbidden: vi.fn(),
  revalidatePath: vi.fn(),
  requireStaffContext: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  createAudit: vi.fn(),
}));

vi.mock("next/navigation", () => ({ forbidden: mocks.forbidden }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: mocks.assertSameSiteRequest,
}));
vi.mock("@/lib/staff", () => ({
  requireStaffContext: mocks.requireStaffContext,
}));
vi.mock("@/lib/prisma", () => {
  const prisma = {
    certificateForm: {
      create: mocks.create,
      update: mocks.update,
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
    },
    certificateFormAuditLog: { create: mocks.createAudit },
  };
  return {
    getPrisma: () => ({
      ...prisma,
      $transaction: (callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
    }),
  };
});

import {
  createCertificateFormAction,
  duplicateCertificateFormAction,
  setCertificateFormStatusAction,
  updateCertificateFormAction,
} from "../src/app/staff/certificate-forms/actions";

const validForm = {
  title: "Справка для визы",
  description: "Подтверждение для студента.",
  executionDays: 5,
  deliveryMethods: ["ELECTRONIC"],
  requiresApproval: false,
  template: "Выдана {{ФИО}}, {{группа}}, {{дата}}.",
  fields: [
    { id: "purpose", label: "Цель", kind: "text", required: true, maxLength: 300 },
  ],
};

const actions = [
  ["create", () => createCertificateFormAction(validForm, true)],
  ["update", () => updateCertificateFormAction("STUDY_CERTIFICATE", 1, validForm)],
  ["duplicate", () => duplicateCertificateFormAction("STUDY_CERTIFICATE")],
  ["archive", () => setCertificateFormStatusAction("STUDY_CERTIFICATE", "ARCHIVED")],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaffContext.mockResolvedValue({ isManagerAccount: true, userId: 9 });
  mocks.forbidden.mockImplementation(() => {
    throw new Error("Forbidden");
  });
  mocks.findMany.mockResolvedValue([]);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.findUnique.mockResolvedValue({
    id: 4,
    version: 1,
    status: "ACTIVE",
    sortOrder: 10,
    ...validForm,
  });
});

function expectNothingWritten() {
  for (const write of [mocks.create, mocks.update, mocks.updateMany, mocks.createAudit]) {
    expect(write).not.toHaveBeenCalled();
  }
}

describe("certificate form permissions", () => {
  it.each(actions)("denies %s to ordinary staff", async (_name, run) => {
    mocks.requireStaffContext.mockResolvedValue({ isManagerAccount: false, userId: 8 });
    await expect(run()).rejects.toThrow("Forbidden");
    expectNothingWritten();
  });

  it.each(actions)("denies %s to students and guests", async (_name, run) => {
    // requireStaffContext прерывает запрос студента и гостя сам.
    mocks.requireStaffContext.mockRejectedValue(new Error("Forbidden"));
    await expect(run()).rejects.toThrow("Forbidden");
    expectNothingWritten();
  });

  it.each(actions)("denies %s from another site", async (_name, run) => {
    mocks.assertSameSiteRequest.mockRejectedValueOnce(new Error("Cross-site"));
    await expect(run()).rejects.toThrow("Cross-site");
    expectNothingWritten();
  });

  it.each(actions)("allows %s to the main staff member", async (_name, run) => {
    await expect(run()).resolves.toMatchObject({ ok: true });
  });
});

describe("certificate form actions", () => {
  it("creates a published form with a generated code and an audit record", async () => {
    mocks.findMany.mockResolvedValue([{ code: "SPRAVKA_DLYA_VIZY" }]);
    await createCertificateFormAction(validForm, true);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "SPRAVKA_DLYA_VIZY_2",
        status: "ACTIVE",
        active: true,
        normalizedTitle: "справка для визы",
        auditLogs: { create: { actorUserId: 9, action: "CREATED", version: 1 } },
      }),
    });
  });

  it("saves a draft that students cannot see", async () => {
    await createCertificateFormAction(validForm, false);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "DRAFT", active: false }),
    });
  });

  it("reports a duplicate title under its field", async () => {
    mocks.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(createCertificateFormAction(validForm, true)).resolves.toMatchObject({
      ok: false,
      fieldErrors: { title: "Вид справки с таким названием уже есть." },
    });
  });

  it("rejects invalid input on the server", async () => {
    await expect(
      createCertificateFormAction({ ...validForm, executionDays: 0 }, true),
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { executionDays: expect.any(String) },
    });
    expectNothingWritten();
  });

  it("raises the version and records what changed", async () => {
    await updateCertificateFormAction("STUDY_CERTIFICATE", 1, {
      ...validForm,
      executionDays: 8,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 4, version: 1 },
      data: expect.objectContaining({ executionDays: 8, version: 2 }),
    });
    expect(mocks.createAudit).toHaveBeenCalledWith({
      data: {
        formId: 4,
        actorUserId: 9,
        action: "UPDATED",
        version: 2,
        changedFields: ["executionDays"],
      },
    });
  });

  it("does not overwrite changes made in another window", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      updateCertificateFormAction("STUDY_CERTIFICATE", 1, {
        ...validForm,
        executionDays: 8,
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(mocks.createAudit).not.toHaveBeenCalled();
  });

  it("duplicates into a draft with a free title", async () => {
    mocks.findMany.mockResolvedValueOnce([
      { title: "…", normalizedTitle: "справка для визы (копия)" },
    ]);
    await duplicateCertificateFormAction("STUDY_CERTIFICATE");
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Справка для визы (копия 2)",
        status: "DRAFT",
      }),
    });
  });

  it("archives without deleting and logs the action", async () => {
    await setCertificateFormStatusAction("STUDY_CERTIFICATE", "ARCHIVED");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { status: "ARCHIVED", active: false },
    });
    expect(mocks.createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "ARCHIVED", actorUserId: 9 }),
    });
  });
});
