import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  forbiddenMock,
  revalidatePathMock,
  requireStaffContextMock,
  createCertificateFormMock,
  updateCertificateFormMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  forbiddenMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  createCertificateFormMock: vi.fn(),
  updateCertificateFormMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ forbidden: forbiddenMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));
vi.mock("@/lib/staff", () => ({
  requireStaffContext: requireStaffContextMock,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    certificateForm: {
      create: createCertificateFormMock,
      updateMany: updateCertificateFormMock,
    },
  })),
}));

import {
  createCertificateFormAction,
  updateCertificateFormAction,
} from "../src/app/staff/certificate-forms/actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

const validForm = {
  code: "NEW_CERTIFICATE",
  title: "Новая справка",
  description: "Подтверждение для студента.",
  executionDays: "5",
  fields: JSON.stringify([
    {
      id: "purpose",
      label: "Цель",
      kind: "text",
      required: true,
      maxLength: 300,
    },
  ]),
};

beforeEach(() => {
  vi.clearAllMocks();
  requireStaffContextMock.mockResolvedValue({ isManagerAccount: true });
  forbiddenMock.mockImplementation(() => {
    throw new Error("Forbidden");
  });
  createCertificateFormMock.mockResolvedValue({});
  updateCertificateFormMock.mockResolvedValue({ count: 1 });
});

describe("certificate form actions", () => {
  it("allows only the manager to create forms", async () => {
    requireStaffContextMock.mockResolvedValue({ isManagerAccount: false });

    await expect(
      createCertificateFormAction({}, formData(validForm)),
    ).rejects.toThrow("Forbidden");
    expect(createCertificateFormMock).not.toHaveBeenCalled();

    requireStaffContextMock.mockResolvedValue({ isManagerAccount: true });
    await expect(
      createCertificateFormAction({}, formData(validForm)),
    ).resolves.toEqual({ success: "Форма справки создана." });
    expect(createCertificateFormMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "NEW_CERTIFICATE",
        active: true,
        sortOrder: 100,
      }),
    });
  });

  it("archives a form without deleting it", async () => {
    const data = formData({ ...validForm, active: "" });

    await expect(updateCertificateFormAction({}, data)).resolves.toEqual({
      success: "Форма отправлена в архив. Уже поданные заявки сохранены.",
    });
    expect(updateCertificateFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: "NEW_CERTIFICATE" },
        data: expect.objectContaining({ active: false }),
      }),
    );
  });
});
