import { Suspense } from "react";
import Link from "next/link";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";
import { deleteStudentDocumentAction, uploadStudentDocumentAction } from "./actions";

async function MineContent() {
  const student = await requireStudent();
  const documents = await getPrisma().studentDocument.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <CampusSection eyebrow="Документы и заявки" title="Мои документы" description="Личный архив ваших сканов и файлов.">
      <form action={uploadStudentDocumentAction} encType="multipart/form-data">
        <label>Название<input name="title" maxLength={120} required /></label>
        <label>Тип<select name="documentType">
          <option value="PASSPORT">Паспорт</option>
          <option value="SNILS">СНИЛС</option>
          <option value="INSURANCE">Полис ОМС</option>
          <option value="CONTRACT">Договор</option>
          <option value="OTHER">Другое</option>
        </select></label>
        <label>Файл<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /></label>
        <button type="submit">Загрузить</button>
      </form>
      {documents.length === 0 ? <p>Личных документов пока нет.</p> : (
        <ul>{documents.map((document) => (
          <li key={document.id}>
            <strong>{document.title}</strong>
            {" "}
            <Link href={`/files/student-documents/${document.id}`} target="_blank">Открыть</Link>
            <form action={deleteStudentDocumentAction}>
              <input type="hidden" name="id" value={document.id} />
              <button type="submit">Удалить</button>
            </form>
          </li>
        ))}</ul>
      )}
    </CampusSection>
  );
}

export default function MineDocumentsPage() {
  return (
    <Suspense fallback={<CampusLoading label="личный архив" />}>
      <MineContent />
    </Suspense>
  );
}
