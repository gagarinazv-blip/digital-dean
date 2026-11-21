import { describe, expect, it } from "vitest";
import {
  demoAcademicStudentCredentials,
  demoStaffAccounts,
  testSeedStudentAccounts,
} from "../prisma/demo-account-data";

describe("demo account seed credentials", () => {
  it("assigns every seeded student and staff account a unique E.164 phone and password variable", () => {
    const accounts = [
      ...demoAcademicStudentCredentials,
      ...testSeedStudentAccounts,
      ...demoStaffAccounts,
    ];
    const phones = accounts.map((account) => account.phone);

    expect(phones.every((phone) => /^\+[1-9]\d{7,14}$/.test(phone))).toBe(
      true,
    );
    expect(new Set(phones).size).toBe(phones.length);
    expect(
      accounts.every(
        (account) =>
          typeof account.passwordVariable === "string" &&
          account.passwordVariable.length > 0,
      ),
    ).toBe(true);
    expect(accounts.every((account) => !("password" in account))).toBe(true);
  });
});
