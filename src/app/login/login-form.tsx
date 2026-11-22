"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { PhoneInput } from "@/components/phone-input";
import {
  loginAction,
  requestStudentPasswordResetCodeAction,
  setStudentPasswordAction,
  studentPhoneLoginAction,
  verifyStudentPasswordResetCodeAction,
  type LoginActionState,
  type StudentCodeRequestState,
} from "./actions";
import styles from "./login.module.css";

const initialState: LoginActionState = {};
const initialCodeState: StudentCodeRequestState = {};

type LoginRole = "student" | "staff";
type StudentLoginStep = "password" | "request-code" | "verify-code";

function ActionError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  return (
    <div aria-live="polite" className={styles.messageSlot}>
      {message && (
        <p className={styles.error} id={id} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

function StaffCredentialsForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <input name="role" type="hidden" value="staff" />
      <div className={styles.field}>
        <label htmlFor="login-staff-username">
          Телефон или служебный логин
        </label>
        <PhoneInput
          aria-describedby={
            state.phoneError
              ? "login-staff-phone-error"
              : state.error
                ? "login-staff-error"
                : undefined
          }
          aria-invalid={state.phoneError ? true : undefined}
          autoComplete="username"
          id="login-staff-username"
          maxLength={128}
          name="login"
          placeholder="+7 (900) 000-00-00 или staff.demo"
          required
          inputMode="text"
          inputType="text"
        />
        {state.phoneError && (
          <span
            className={styles.fieldError}
            id="login-staff-phone-error"
            role="alert"
          >
            {state.phoneError}
          </span>
        )}
        <p className={styles.fieldHint}>
          Для старых аккаунтов по-прежнему подходит служебный логин.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="login-staff-password">Пароль сотрудника</label>
        <PasswordInput
          aria-describedby={state.error ? "login-staff-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          id="login-staff-password"
          name="password"
          required
        />
      </div>
      <ActionError id="login-staff-error" message={state.error} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}

function StudentPasswordLogin({
  onPhoneChange,
  onForgotPassword,
  phone,
}: {
  onPhoneChange: (value: string) => void;
  onForgotPassword: (phone: string) => void;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(
    studentPhoneLoginAction,
    initialState,
  );

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="login-student-phone">
          Телефон или прежний логин
        </label>
        <PhoneInput
          aria-describedby={
            state.phoneError ? "login-student-phone-error" : undefined
          }
          aria-invalid={Boolean(state.phoneError) || undefined}
          autoComplete="username"
          id="login-student-phone"
          inputType="text"
          maxLength={128}
          onValueChange={onPhoneChange}
          placeholder="+7 (900) 000-00-01"
          required
          value={phone}
        />
        {state.phoneError && (
          <span
            className={styles.fieldError}
            id="login-student-phone-error"
            role="alert"
          >
            {state.phoneError}
          </span>
        )}
        <p className={styles.fieldHint}>
          Аккаунты без привязанного телефона могут войти по прежнему логину.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="login-student-password">Пароль студента</label>
        <PasswordInput
          aria-describedby={state.error ? "login-student-password-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          id="login-student-password"
          name="password"
          required
        />
        <input name="phone" type="hidden" value={phone} />
      </div>
      <ActionError
        id="login-student-password-error"
        message={state.error}
      />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Входим…" : "Войти"}
      </button>
      <div className={styles.loginLinks}>
        <button
          className={styles.textButton}
          onClick={() => onForgotPassword(phone)}
          type="button"
        >
          Забыли пароль?
        </button>
      </div>
    </form>
  );
}

function StudentCodeRequest({
  initialPhone,
  onCodeSent,
  onReturn,
}: {
  initialPhone: string;
  onCodeSent: (phone: string) => void;
  onReturn: () => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [state, formAction, pending] = useActionState(
    requestStudentPasswordResetCodeAction,
    initialCodeState,
  );

  useEffect(() => {
    if (state.sent && state.phone) {
      onCodeSent(state.phone);
    }
  }, [onCodeSent, state.phone, state.sent]);

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <p className={styles.stepDescription}>
        Введите номер телефона, привязанный к аккаунту, чтобы восстановить
        пароль.
      </p>
      <div className={styles.field}>
        <label htmlFor="login-student-code-phone">Номер телефона</label>
        <PhoneInput
          aria-describedby={state.error ? "login-student-code-error" : undefined}
          aria-invalid={Boolean(state.error) || undefined}
          autoComplete="tel"
          id="login-student-code-phone"
          onValueChange={setPhone}
          placeholder="+7 (900) 000-00-01"
          required
          value={phone}
        />
        {state.error && (
          <span
            className={styles.fieldError}
            id="login-student-code-error"
            role="alert"
          >
            {state.error}
          </span>
        )}
        <input name="phone" type="hidden" value={phone} />
      </div>
      <ActionError id="login-student-code-error" message={state.error} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Отправляем…" : "Отправить код"}
      </button>
      <button
        className={styles.textButton}
        onClick={onReturn}
        type="button"
      >
        Вернуться ко входу
      </button>
    </form>
  );
}

function StudentCodeVerification({
  onReturn,
  phone,
}: {
  onReturn: () => void;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(
    verifyStudentPasswordResetCodeAction,
    initialState,
  );

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <p className={styles.stepDescription}>
        Если номер зарегистрирован, введите код восстановления из SMS.
      </p>
      <div className={styles.field}>
        <label htmlFor="login-student-code">Код из SMS</label>
        <input name="phone" type="hidden" value={phone} />
        <input
          aria-describedby={state.error ? "login-student-code-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="one-time-code"
          id="login-student-code"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          name="code"
          pattern="[0-9]{6}"
          required
          type="text"
        />
      </div>
      <ActionError id="login-student-code-error" message={state.error} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Проверяем код…" : "Подтвердить"}
      </button>
      <button
        className={styles.textButton}
        onClick={onReturn}
        type="button"
      >
        Изменить номер или запросить код повторно
      </button>
    </form>
  );
}

function StudentLoginForm() {
  const [step, setStep] = useState<StudentLoginStep>("password");
  const [phone, setPhone] = useState("");

  if (step === "request-code") {
    return (
      <StudentCodeRequest
        initialPhone={phone}
        onCodeSent={(normalizedPhone) => {
          setPhone(normalizedPhone);
          setStep("verify-code");
        }}
        onReturn={() => setStep("password")}
      />
    );
  }
  if (step === "verify-code") {
    return (
      <StudentCodeVerification
        onReturn={() => setStep("request-code")}
        phone={phone}
      />
    );
  }

  return (
    <StudentPasswordLogin
      onPhoneChange={setPhone}
      onForgotPassword={(currentPhone) => {
        setPhone(currentPhone);
        setStep("request-code");
      }}
      phone={phone}
    />
  );
}

function PasswordStrength({ password }: { password: string }) {
  const hasLength = Array.from(password).length >= 10;
  const hasLetters = /[a-zа-я]/i.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zа-я\d]/i.test(password);
  const score = [hasLength, hasLetters, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;
  const label =
    password.length === 0
      ? "Введите пароль"
      : score <= 2
        ? "Ненадёжный"
        : score === 3
          ? "Средний"
          : "Надёжный";

  return (
    <div className={styles.passwordStrength}>
      <meter
        aria-label={`Надёжность пароля: ${label}`}
        className={styles.strengthMeter}
        max={4}
        min={0}
        value={score}
      />
      <span aria-live="polite">{label}</span>
    </div>
  );
}

function PasswordResetForm() {
  const [state, formAction, pending] = useActionState(
    setStudentPasswordAction,
    initialState,
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <p className={styles.stepDescription}>
        Задайте новый пароль. После сохранения войдите по телефону и паролю.
      </p>
      <div className={styles.field}>
        <label htmlFor="student-new-password">Новый пароль</label>
        <PasswordInput
          aria-describedby={state.error ? "student-password-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="new-password"
          id="student-new-password"
          maxLength={72}
          minLength={10}
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          value={password}
        />
        <PasswordStrength password={password} />
        <p className={styles.fieldHint}>
          Не менее 10 символов, не номер телефона и не простой пароль.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="student-password-confirmation">Повторите пароль</label>
        <PasswordInput
          aria-describedby={state.error ? "student-password-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="new-password"
          id="student-password-confirmation"
          maxLength={72}
          minLength={10}
          name="confirmation"
          required
          toggleLabel="Показать подтверждение пароля"
        />
      </div>
      <ActionError id="student-password-error" message={state.error} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Сохраняем пароль…" : "Сохранить новый пароль"}
      </button>
    </form>
  );
}

export function StudentPasswordResetForm() {
  return <PasswordResetForm />;
}

export function LoginForm({ initialRole }: { initialRole: LoginRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentTabRef = useRef<HTMLButtonElement>(null);
  const staffTabRef = useRef<HTMLButtonElement>(null);
  const roleValues = searchParams.getAll("role");
  const roleParam = roleValues.length === 1 ? roleValues[0] : null;
  const role: LoginRole =
    roleParam === "staff"
      ? "staff"
      : roleParam === "student"
        ? "student"
        : roleValues.length === 0
          ? initialRole
          : "student";
  const hasCanonicalRole = roleValues.length === 1 && roleValues[0] === role;

  useEffect(() => {
    if (!hasCanonicalRole) {
      router.replace(`/login?role=${role}`, { scroll: false });
    }
  }, [hasCanonicalRole, role, router]);

  function selectRole(nextRole: LoginRole) {
    if (role !== nextRole || !hasCanonicalRole) {
      router.replace(`/login?role=${nextRole}`, { scroll: false });
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentRole: LoginRole,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const nextRole = currentRole === "student" ? "staff" : "student";
    (nextRole === "student" ? studentTabRef : staffTabRef).current?.focus();
    selectRole(nextRole);
  }

  return (
    <>
      <div aria-label="Тип аккаунта" className={styles.roleTabs} role="tablist">
        <button
          aria-controls="login-panel"
          aria-selected={role === "student"}
          className={styles.roleTab}
          id="login-tab-student"
          onClick={() => selectRole("student")}
          onKeyDown={(event) => handleTabKeyDown(event, "student")}
          ref={studentTabRef}
          role="tab"
          tabIndex={role === "student" ? 0 : -1}
          type="button"
        >
          Студент
        </button>
        <button
          aria-controls="login-panel"
          aria-selected={role === "staff"}
          className={styles.roleTab}
          id="login-tab-staff"
          onClick={() => selectRole("staff")}
          onKeyDown={(event) => handleTabKeyDown(event, "staff")}
          ref={staffTabRef}
          role="tab"
          tabIndex={role === "staff" ? 0 : -1}
          type="button"
        >
          Сотрудник
        </button>
      </div>
      <div
        aria-labelledby={`login-tab-${role}`}
        className={styles.tabPanel}
        id="login-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {role === "staff" ? (
          <StaffCredentialsForm key="staff" />
        ) : (
          <StudentLoginForm key="student" />
        )}
      </div>
    </>
  );
}
