import { Suspense } from "react";
import { CampusLoading, CampusSection } from "@/components/campus-section";
import {
  StudentDocumentArchive,
  UploadDocumentDialog,
} from "./document-archive";
import { getPrisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/student";

async function MineContent() {
  const student = await requireStudent();
  const documents = await getPrisma().studentDocument.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      documentType: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
  return (
    <CampusSection
      description="Здесь хранятся сканы ваших документов, которые могут понадобиться при оформлении заявок."
      eyebrow="Документы и заявки"
      headerAction={<UploadDocumentDialog buttonLabel="Загрузить документ" />}
      title="Мои документы"
    >
      <StudentDocumentArchive documents={documents} />
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
