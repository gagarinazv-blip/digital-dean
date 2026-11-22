import { forbidden } from "next/navigation";
import { requireStaffContext } from "@/lib/staff";
import { getCertificateForms } from "@/lib/certificate-forms";
import { CertificateFormEditor } from "./form-editor";
import styles from "./certificate-forms.module.css";

export const instant = false;

export default async function CertificateFormsPage() {
  const { isManagerAccount } = await requireStaffContext();
  if (!isManagerAccount) {
    forbidden();
  }
  const forms = await getCertificateForms({ includeInactive: true });

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Рабочее место / Настройки</p>
          <h1>Формы справок</h1>
          <p>
            Настраивайте услуги и поля заявлений. Архивирование скрывает форму
            для новых заявок, но не удаляет поданные заявления и их снимки.
          </p>
        </div>
      </header>

      <section className={styles.panel} aria-labelledby="create-form-title">
        <h2 id="create-form-title">Новая услуга</h2>
        <CertificateFormEditor />
      </section>

      <section className={styles.formsSection} aria-labelledby="forms-title">
        <div className={styles.sectionHeading}>
          <h2 id="forms-title">Каталог услуг</h2>
          <span>{forms.length}</span>
        </div>
        {forms.length === 0 ? (
          <p className={styles.emptyState}>
            Форм пока нет. Создайте первую услугу выше.
          </p>
        ) : (
          <div className={styles.formList}>
            {forms.map((form) => (
              <details className={styles.panel} key={form.code}>
                <summary>
                  <span>
                    <strong>{form.title}</strong>
                    <span>{form.code} · до {form.executionDays} рабочих дней</span>
                  </span>
                  <span
                    className={styles.status}
                    data-active={form.active ? "true" : "false"}
                  >
                    {form.active ? "Активна" : "В архиве"}
                  </span>
                </summary>
                <CertificateFormEditor initialForm={form} />
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
