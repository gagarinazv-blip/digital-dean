"use client";

import { DateTimeStack } from "@/components/date-time-stack";
import { useState } from "react";
import { revealCorporateMailPasswordAction } from "./actions";
import styles from "./profile.module.css";

type CorporateMailCardProps = {
  email: string | null;
  issuedAt: Date | null;
};

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function CorporateMailCard({
  email,
  issuedAt,
}: CorporateMailCardProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function getPassword(): Promise<string | null> {
    try {
      const result = await revealCorporateMailPasswordAction();
      if (!result.password) {
        setMessage(
          result.error ?? "Не удалось получить пароль. Попробуйте позже.",
        );
        return null;
      }
      return result.password;
    } catch {
      setMessage("Не удалось получить пароль. Попробуйте позже.");
      return null;
    }
  }

  async function togglePassword(): Promise<void> {
    setMessage("");
    if (passwordVisible) {
      setPasswordVisible(false);
      setPassword(null);
      return;
    }

    setBusy(true);
    try {
      const value = await getPassword();
      if (value !== null) {
        setPassword(value);
        setPasswordVisible(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail(): Promise<void> {
    if (!email) return;
    setBusy(true);
    setMessage("");
    try {
      await copyText(email);
      setMessage("Адрес скопирован.");
    } catch {
      setMessage("Не удалось скопировать. Проверьте разрешение браузера.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword(): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const value = await getPassword();
      if (value === null) return;
      await copyText(value);
      setMessage("Пароль скопирован.");
    } catch {
      setMessage("Не удалось скопировать. Проверьте разрешение браузера.");
    } finally {
      setBusy(false);
    }
  }

  const isIssued = Boolean(email && issuedAt);

  return (
    <section
      className={styles.mailSection}
      aria-labelledby="corporate-mail-title"
    >
      <div className={styles.mailHeading}>
        <div>
          <p className={styles.sectionEyebrow}>
            Доступ к университетским сервисам
          </p>
          <h2 id="corporate-mail-title">Корпоративная почта</h2>
        </div>
      </div>

      {isIssued ? (
        <div className={styles.mailCard}>
          <div className={styles.mailField}>
            <div className={styles.mailValue}>
              <span className={styles.mailLabel}>Адрес почты</span>
              <span className={styles.mailText}>{email}</span>
            </div>
            <button
              className={styles.mailButton}
              type="button"
              onClick={() => void copyEmail()}
              disabled={busy}
            >
              Копировать
            </button>
          </div>

          <div className={styles.mailField}>
            <div className={styles.mailValue}>
              <span className={styles.mailLabel}>Пароль</span>
              <span className={styles.mailText} aria-live="polite">
                {passwordVisible ? password : "••••••••••"}
              </span>
            </div>
            <div className={styles.mailActions}>
              <button
                className={styles.mailButton}
                type="button"
                onClick={() => void togglePassword()}
                disabled={busy}
              >
                {passwordVisible ? "Скрыть" : "Показать"}
              </button>
              <button
                className={styles.mailButton}
                type="button"
                onClick={() => void copyPassword()}
                disabled={busy}
              >
                Копировать
              </button>
            </div>
          </div>

          <p className={styles.mailHint}>
            Рекомендуем сменить пароль после первого входа в почту.
          </p>
          {issuedAt ? (
            <div className={styles.mailIssued}>
              <span>Данные выданы</span>
              <DateTimeStack value={issuedAt} />
            </div>
          ) : null}
          <p className={styles.mailMessage} role="status" aria-live="polite">
            {message}
          </p>
        </div>
      ) : (
        <p className={styles.mailPending}>
          Данные в обработке. Корпоративная почта будет выдана после проверки
        </p>
      )}
    </section>
  );
}
