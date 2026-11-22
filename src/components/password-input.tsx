"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeClosed } from "iconoir-react";
import styles from "./password-input.module.css";

/** Поле пароля с глазком: значок меняется, подпись есть только для чтения с экрана. */
export function PasswordInput({
  toggleLabel = "Показать пароль",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { toggleLabel?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.field}>
      <input {...props} type={isVisible ? "text" : "password"} />
      <button
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        className={styles.toggle}
        onClick={() => setIsVisible((visible) => !visible)}
        type="button"
      >
        <span className={styles.icon} data-visible={!isVisible || undefined}>
          <Eye aria-hidden="true" strokeWidth={1.8} />
        </span>
        <span className={styles.icon} data-visible={isVisible || undefined}>
          <EyeClosed aria-hidden="true" strokeWidth={1.8} />
        </span>
      </button>
    </div>
  );
}
