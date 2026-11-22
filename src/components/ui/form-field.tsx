import { useId, type ReactNode } from "react";
import { WarningTriangle } from "iconoir-react";
import styles from "./controls.module.css";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  className: string;
};

// Подпись, подсказка и ошибка связаны с полем через id, поэтому их озвучивает
// скринридер, а вид одинаков во всех формах.
export function FormField({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className={styles.required}>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        className: styles.control,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(required ? { "aria-required": true as const } : {}),
      })}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className={styles.fieldError} id={id}>
      <WarningTriangle aria-hidden="true" strokeWidth={1.8} />
      <span>{children}</span>
    </p>
  );
}
