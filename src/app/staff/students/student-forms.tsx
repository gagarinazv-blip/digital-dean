"use client";

import { useActionState, useRef, useState } from "react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  createStaffStudentAction,
  resetStudentAccessAction,
  updateStaffStudentAction,
  type StudentManagementActionState,
} from "./actions";
import styles from "./students.module.css";

type GroupOption = {
  id: number;
  name: string;
};

const initialState: StudentManagementActionState = {};
const courseOptions = [1, 2, 3, 4, 5, 6] as const;

function ActionFeedback({
  state,
}: {
  state: StudentManagementActionState;
}) {
  return (
    <>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.requiresPhoneConfirmation ? (
        <p className={styles.error} role="alert">
          Подтвердите смену номера телефона.
        </p>
      ) : null}
      {state.success ? (
        <p className={styles.success} role="status" aria-live="polite">
          {state.success}
        </p>
      ) : null}
    </>
  );
}

function phoneComparisonKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^8\d{10}$/.test(digits)) return `7${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `7${digits}`;
  return digits;
}

const passwordAlphabet = {
  uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lowercase: "abcdefghijkmnopqrstuvwxyz",
  digits: "23456789",
  symbols: "!@#$%&*+-_",
};
const passwordCharacters = Object.values(passwordAlphabet).join("");

function randomIndex(max: number): number {
  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const randomValue = new Uint32Array(1);
  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= limit);
  return randomValue[0] % max;
}

function generateStrongPassword(): string {
  const characters = Object.values(passwordAlphabet).map(
    (alphabet) => alphabet[randomIndex(alphabet.length)],
  );
  while (characters.length < 24) {
    characters.push(
      passwordCharacters[randomIndex(passwordCharacters.length)],
    );
  }
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }
  return characters.join("");
}

export function CreateStudentForm({ groups }: { groups: GroupOption[] }) {
  const [state, formAction, pending] = useActionState(
    createStaffStudentAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.formGrid}>
        <label className={styles.field} htmlFor="create-student-fullName">
          ФИО
          <input
            aria-describedby={
              state.fieldErrors?.fullName
                ? "create-fullName-error"
                : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.fullName)}
            autoComplete="name"
            id="create-student-fullName"
            maxLength={160}
            name="fullName"
            required
          />
          {state.fieldErrors?.fullName ? (
            <span className={styles.fieldError} id="create-fullName-error">
              {state.fieldErrors.fullName}
            </span>
          ) : null}
        </label>

        <label className={styles.field} htmlFor="create-student-phone">
          Номер телефона
          <input
            aria-describedby={
              state.fieldErrors?.phone ? "create-phone-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            autoComplete="tel"
            id="create-student-phone"
            inputMode="tel"
            name="phone"
            placeholder="+7 900 000-00-01"
            required
            type="tel"
          />
          {state.fieldErrors?.phone ? (
            <span className={styles.fieldError} id="create-phone-error">
              {state.fieldErrors.phone}
            </span>
          ) : null}
        </label>

        <label className={styles.field} htmlFor="create-student-faculty">
          Факультет
          <input
            aria-describedby={
              state.fieldErrors?.faculty ? "create-faculty-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.faculty)}
            id="create-student-faculty"
            maxLength={180}
            name="faculty"
            required
          />
          {state.fieldErrors?.faculty ? (
            <span className={styles.fieldError} id="create-faculty-error">
              {state.fieldErrors.faculty}
            </span>
          ) : null}
        </label>

        <label className={styles.field} htmlFor="create-student-direction">
          Направление
          <input
            aria-describedby={
              state.fieldErrors?.direction
                ? "create-direction-error"
                : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.direction)}
            id="create-student-direction"
            maxLength={180}
            name="direction"
            required
          />
          {state.fieldErrors?.direction ? (
            <span className={styles.fieldError} id="create-direction-error">
              {state.fieldErrors.direction}
            </span>
          ) : null}
        </label>

        <label className={styles.field} htmlFor="create-student-course">
          Курс
          <select
            aria-describedby={
              state.fieldErrors?.course ? "create-course-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.course)}
            defaultValue=""
            id="create-student-course"
            name="course"
            required
          >
            <option disabled value="">
              Выберите курс
            </option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>
                {course} курс
              </option>
            ))}
          </select>
          {state.fieldErrors?.course ? (
            <span className={styles.fieldError} id="create-course-error">
              {state.fieldErrors.course}
            </span>
          ) : null}
        </label>

        <label className={styles.field} htmlFor="create-student-group">
          Группа
          <select
            aria-describedby={
              state.fieldErrors?.groupId ? "create-group-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.groupId)}
            defaultValue=""
            id="create-student-group"
            name="groupId"
            required
          >
            <option disabled value="">
              Выберите группу
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.groupId ? (
            <span className={styles.fieldError} id="create-group-error">
              {state.fieldErrors.groupId}
            </span>
          ) : null}
        </label>
      </div>

      <ActionFeedback state={state} />
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={pending} type="submit">
          {pending ? "Создаём…" : "Создать приглашённую учётную запись"}
        </button>
      </div>
    </form>
  );
}

type EditableStudent = {
  id: number;
  fullName: string;
  phone: string | null;
  course: number;
  groupId: number;
  corporateEmail: string | null;
  mailPasswordSet: boolean;
  mailIssuedDate: string | null;
};

export function UpdateStudentForm({
  groups,
  mailDomain,
  student,
}: {
  groups: GroupOption[];
  mailDomain: string;
  student: EditableStudent;
}) {
  const [phoneChanged, setPhoneChanged] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    async (previousState: StudentManagementActionState, formData: FormData) => {
      const nextState = await updateStaffStudentAction(
        previousState,
        formData,
      );
      if (nextState.success) {
        setConfirmationOpen(false);
        setPhoneChanged(false);
        if (passwordInputRef.current) passwordInputRef.current.value = "";
      } else if (nextState.error || nextState.fieldErrors) {
        setConfirmationOpen(false);
      }
      return nextState;
    },
    initialState,
  );

  function handlePhoneChange(value: string): void {
    setPhoneChanged(
      phoneComparisonKey(value) !==
        phoneComparisonKey(student.phone ?? ""),
    );
    setConfirmationOpen(false);
  }

  return (
    <>
      <form
        action={formAction}
        className={styles.form}
        id={`student-edit-${student.id}`}
      >
        <input name="studentId" type="hidden" value={student.id} />
        <div className={styles.formGrid}>
          <label className={styles.field} htmlFor={`student-name-${student.id}`}>
            ФИО
            <input
              aria-describedby={
                state.fieldErrors?.fullName
                  ? `fullName-error-${student.id}`
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.fullName)}
              autoComplete="name"
              defaultValue={student.fullName}
              id={`student-name-${student.id}`}
              maxLength={160}
              name="fullName"
              required
            />
            {state.fieldErrors?.fullName ? (
              <span
                className={styles.fieldError}
                id={`fullName-error-${student.id}`}
              >
                {state.fieldErrors.fullName}
              </span>
            ) : null}
          </label>

          <label className={styles.field} htmlFor={`student-phone-${student.id}`}>
            Номер телефона
            <input
              aria-describedby={
                state.fieldErrors?.phone
                  ? `phone-error-${student.id}`
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              autoComplete="tel"
              defaultValue={student.phone ?? ""}
              id={`student-phone-${student.id}`}
              inputMode="tel"
              name="phone"
              onChange={(event) => handlePhoneChange(event.target.value)}
              placeholder="+7 900 000-00-01"
              required
              type="tel"
            />
            {state.fieldErrors?.phone ? (
              <span
                className={styles.fieldError}
                id={`phone-error-${student.id}`}
              >
                {state.fieldErrors.phone}
              </span>
            ) : null}
          </label>

          <label className={styles.field} htmlFor={`student-course-${student.id}`}>
            Курс
            <select
              aria-describedby={
                state.fieldErrors?.course
                  ? `course-error-${student.id}`
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.course)}
              defaultValue={student.course}
              id={`student-course-${student.id}`}
              name="course"
              required
            >
              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>
            {state.fieldErrors?.course ? (
              <span
                className={styles.fieldError}
                id={`course-error-${student.id}`}
              >
                {state.fieldErrors.course}
              </span>
            ) : null}
          </label>

          <label className={styles.field} htmlFor={`student-group-${student.id}`}>
            Группа
            <select
              aria-describedby={
                state.fieldErrors?.groupId
                  ? `group-error-${student.id}`
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.groupId)}
              defaultValue={student.groupId}
              id={`student-group-${student.id}`}
              name="groupId"
              required
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.groupId ? (
              <span
                className={styles.fieldError}
                id={`group-error-${student.id}`}
              >
                {state.fieldErrors.groupId}
              </span>
            ) : null}
          </label>

          <label className={styles.field} htmlFor={`student-email-${student.id}`}>
            Корпоративная почта
            <input
              aria-describedby={
                state.fieldErrors?.corporateEmail
                  ? `email-error-${student.id}`
                  : `email-hint-${student.id}`
              }
              aria-invalid={Boolean(state.fieldErrors?.corporateEmail)}
              autoComplete="off"
              defaultValue={student.corporateEmail ?? ""}
              id={`student-email-${student.id}`}
              maxLength={254}
              name="corporateEmail"
              placeholder={`student@${mailDomain}`}
              type="email"
            />
            <span
              className={styles.fieldHint}
              id={`email-hint-${student.id}`}
            >
              Допустим домен{" "}
              <strong>
                {mailDomain}
              </strong>
              .
            </span>
            {state.fieldErrors?.corporateEmail ? (
              <span
                className={styles.fieldError}
                id={`email-error-${student.id}`}
              >
                {state.fieldErrors.corporateEmail}
              </span>
            ) : null}
          </label>

          <div className={styles.field}>
            <label htmlFor={`student-mail-password-${student.id}`}>
              Задать/заменить пароль почты
            </label>
            <input
              aria-describedby={
                state.fieldErrors?.corporateMailPassword
                  ? `mail-password-error-${student.id}`
                  : `mail-password-status-${student.id}`
              }
              aria-invalid={Boolean(state.fieldErrors?.corporateMailPassword)}
              autoComplete="new-password"
              id={`student-mail-password-${student.id}`}
              maxLength={256}
              name="corporateMailPassword"
              ref={passwordInputRef}
              type="password"
            />
            <span
              className={styles.fieldHint}
              id={`mail-password-status-${student.id}`}
            >
              {student.mailPasswordSet
                ? `Пароль задан${student.mailIssuedDate ? ` · ${student.mailIssuedDate}` : ""}. Сотрудники не могут его прочитать.`
                : "Пароль не задан."}
            </span>
            {state.fieldErrors?.corporateMailPassword ? (
              <span
                className={styles.fieldError}
                id={`mail-password-error-${student.id}`}
              >
                {state.fieldErrors.corporateMailPassword}
              </span>
            ) : null}
            <button
              className={styles.secondaryButton}
              onClick={() => {
                if (passwordInputRef.current) {
                  passwordInputRef.current.value = generateStrongPassword();
                }
              }}
              type="button"
            >
              Сгенерировать надёжный пароль
            </button>
          </div>
        </div>

        {!phoneChanged ? (
          <div className={styles.formActions}>
            <ActionFeedback state={state} />
            <button
              className={styles.primaryButton}
              disabled={pending}
              type="submit"
            >
              {pending ? "Сохраняем…" : "Сохранить изменения"}
            </button>
          </div>
        ) : null}
      </form>

      {phoneChanged ? (
        <div className={styles.formActions}>
          {!confirmationOpen ? <ActionFeedback state={state} /> : null}
          <ConfirmationDialog
            buttonClassName={styles.primaryButton}
            buttonLabel="Сохранить изменения"
            onOpenChange={setConfirmationOpen}
            open={confirmationOpen}
            title="Сменить номер телефона?"
          >
            <p className={styles.dialogHint}>
              Все активные сессии студента будут завершены. Продолжить?
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setConfirmationOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button
                className={styles.primaryButton}
                disabled={pending}
                form={`student-edit-${student.id}`}
                name="confirmPhoneChange"
                type="submit"
                value="true"
              >
                {pending ? "Сохраняем…" : "Подтвердить смену"}
              </button>
            </div>
          </ConfirmationDialog>
        </div>
      ) : null}
    </>
  );
}

export function ResetStudentAccessForm({ studentId }: { studentId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previousState: StudentManagementActionState, formData: FormData) => {
      const nextState = await resetStudentAccessAction(previousState, formData);
      if (nextState.success) setOpen(false);
      return nextState;
    },
    initialState,
  );

  return (
    <div className={styles.form}>
      <ConfirmationDialog
        buttonClassName={styles.dangerButton}
        buttonLabel="Сбросить доступ студента"
        onOpenChange={setOpen}
        open={open}
        title="Сбросить доступ студента?"
      >
        <p className={styles.dialogHint}>
          Все сессии будут завершены. Студенту потребуется подтвердить телефон
          кодом и создать новый пароль.
        </p>
        <form action={formAction}>
          <input name="studentId" type="hidden" value={studentId} />
          <ActionFeedback state={state} />
          <div className={styles.dialogActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => setOpen(false)}
              type="button"
            >
              Отмена
            </button>
            <button
              className={styles.dangerButton}
              disabled={pending}
              type="submit"
            >
              {pending ? "Сбрасываем…" : "Подтвердить сброс"}
            </button>
          </div>
        </form>
      </ConfirmationDialog>
      {!open ? <ActionFeedback state={state} /> : null}
    </div>
  );
}
