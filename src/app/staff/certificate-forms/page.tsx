import { SectionHeader } from "@/components/section-header";
import { forbidden } from "next/navigation";
import { requireStaffContext } from "@/lib/staff";
import { getManagedCertificateForms } from "@/lib/certificate-forms";
import { CertificateFormList } from "./form-list";
import styles from "./certificate-forms.module.css";

export const instant = false;

export default async function CertificateFormsPage() {
  const { isManagerAccount } = await requireStaffContext();
  if (!isManagerAccount) {
    forbidden();
  }
  const forms = await getManagedCertificateForms();

  return (
    <main className={styles.page}>
      <SectionHeader
        description="Настраивайте справки и поля заявки. Архив скрывает справку от студентов, но не меняет уже поданные заявки."
        eyebrow="Рабочее место · Настройки"
        illustration="certificates"
        title="Виды справок"
        tone="wine"
      />
      <CertificateFormList forms={forms} />
    </main>
  );
}
