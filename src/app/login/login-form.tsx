"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loginAction,
  requestStudentCodeAction,
  setStudentPasswordAction,
  studentPhoneLoginAction,
  verifyStudentCodeAction,
  type LoginActionState,
  type StudentCodeRequestState,
} from "./actions";
import styles from "./login.module.css";

const initialState: LoginActionState = {};
const initialCodeState: StudentCodeRequestState = {};

type LoginRole = "student" | "staff";
type StudentLoginStep = "password" | "request-code" | "verify-code";

function formatPhoneInput(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && !digits.startsWith("7")) {
    return `+${digits.slice(0, 15)}`;
  }

  const national = (
    digits.startsWith("7") || digits.startsWith("8")
      ? digits.slice(1)
      : digits
  ).slice(0, 10);
  if (!national) {
    return "";
  }

  const area = national.slice(0, 3);
  const first = national.slice(3, 6);
  const second = national.slice(6, 8);
  const third = national.slice(8, 10);
  return [
    "+7",
    area ? ` (${area}` : "",
    national.length >= 3 ? ")" : "",
    first ? ` ${first}` : "",
    second ? `-${second}` : "",
    third ? `-${third}` : "",
  ].join("");
}

function PhoneField({
  describedBy,
  error,
  id,
  onChange,
  value,
}: {
  describedBy?: string;
  error: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const selection = event.currentTarget.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, selection).replace(/\D/g, "")
      .length;
    const formattedValue = formatPhoneInput(rawValue);
    onChange(formattedValue);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      if (digitsBeforeCaret === 0) {
        input.setSelectionRange(formattedValue.startsWith("+7") ? 2 : 1, formattedValue.startsWith("+7") ? 2 : 1);
        return;
      }
      let digitCount = 0;
      let caret = formattedValue.length;
      for (let index = 0; index < formattedValue.length; index += 1) {
        if (/\d/.test(formattedValue[index])) {
          digitCount += 1;
          if (digitCount === digitsBeforeCaret) {
            caret = index + 1;
            break;
          }
        }
      }
      input.setSelectionRange(caret, caret);
    });
  }

  return (
    <input
      aria-describedby={describedBy}
      aria-invalid={error || undefined}
      autoComplete="tel"
      id={id}
      inputMode="tel"
      maxLength={24}
      onChange={handleChange}
      placeholder="+7 (900) 000-00-01"
      ref={inputRef}
      required
      type="tel"
      value={value}
    />
  );
}

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
        <label htmlFor="login-staff-username">Служебный логин</label>
        <input
          aria-describedby={state.error ? "login-staff-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoCapitalize="none"
          autoComplete="username"
          id="login-staff-username"
          maxLength={128}
          name="login"
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-staff-password">Пароль сотрудника</label>
        <input
          aria-describedby={state.error ? "login-staff-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          id="login-staff-password"
          name="password"
          required
          type="password"
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
  onRequestCode,
  phone,
}: {
  onPhoneChange: (value: string) => void;
  onRequestCode: (phone: string) => void;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(
    studentPhoneLoginAction,
    initialState,
  );

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="login-student-phone">Номер телефона</label>
        <PhoneField
          describedBy={state.error ? "login-student-password-error" : undefined}
          error={Boolean(state.error)}
          id="login-student-phone"
          onChange={onPhoneChange}
          value={phone}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-student-password">Пароль студента</label>
        <input
          aria-describedby={state.error ? "login-student-password-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          id="login-student-password"
          name="password"
          required
          type="password"
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
          onClick={() => onRequestCode(phone)}
          type="button"
        >
          Первый вход
        </button>
        <button
          className={styles.textButton}
          onClick={() => onRequestCode(phone)}
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
    requestStudentCodeAction,
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
        Введите номер телефона, указанный при зачислении.
      </p>
      <div className={styles.field}>
        <label htmlFor="login-student-code-phone">Номер телефона</label>
        <PhoneField
          describedBy={state.error ? "login-student-code-error" : undefined}
          error={Boolean(state.error)}
          id="login-student-code-phone"
          onChange={setPhone}
          value={phone}
        />
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
    verifyStudentCodeAction,
    initialState,
  );

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <p className={styles.stepDescription}>
        Если номер зарегистрирован, следуйте инструкциям для получения кода.
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
      onRequestCode={(currentPhone) => {
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

function PasswordSetupForm() {
  const [state, formAction, pending] = useActionState(
    setStudentPasswordAction,
    initialState,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <p className={styles.stepDescription}>
        Придумайте пароль для входа в личный кабинет.
      </p>
      <div className={styles.field}>
        <label htmlFor="student-new-password">Новый пароль</label>
        <div className={styles.passwordInput}>
          <input
            aria-describedby={state.error ? "student-password-error" : undefined}
            aria-invalid={state.error ? true : undefined}
            autoComplete="new-password"
            id="student-new-password"
            maxLength={72}
            minLength={10}
            name="password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={showPassword}
            className={styles.passwordToggle}
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? "Скрыть" : "Показать"}
          </button>
        </div>
        <PasswordStrength password={password} />
        <p className={styles.fieldHint}>
          Не менее 10 символов, не номер телефона и не простой пароль.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="student-password-confirmation">Повторите пароль</label>
        <div className={styles.passwordInput}>
          <input
            aria-describedby={state.error ? "student-password-error" : undefined}
            aria-invalid={state.error ? true : undefined}
            autoComplete="new-password"
            id="student-password-confirmation"
            maxLength={72}
            minLength={10}
            name="confirmation"
            required
            type={showConfirmation ? "text" : "password"}
          />
          <button
            aria-label={
              showConfirmation ? "Скрыть подтверждение" : "Показать подтверждение"
            }
            aria-pressed={showConfirmation}
            className={styles.passwordToggle}
            onClick={() => setShowConfirmation((visible) => !visible)}
            type="button"
          >
            {showConfirmation ? "Скрыть" : "Показать"}
          </button>
        </div>
      </div>
      <ActionError id="student-password-error" message={state.error} />
      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Сохраняем пароль…" : "Создать пароль"}
      </button>
    </form>
  );
}

export function StudentPasswordSetupForm() {
  return <PasswordSetupForm />;
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
