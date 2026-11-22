import {
  EmptyPage,
  Link as LinkIcon,
  MultiplePages,
  Page,
  Presentation,
} from "iconoir-react";
import type {
  DeadlineMaterialKind,
  DeadlineMaterialUploaderRole,
} from "@/generated/prisma/enums";
import { EmptyState } from "@/components/empty-state";
import {
  deadlineMaterialKindLabels,
  deadlineUploaderRoleLabels,
} from "@/lib/campus-labels";
import { formatUniversityDateTime } from "@/lib/campus-time";
import { getSafeExternalUrl } from "@/lib/deadline-action";
import { formatFileSize } from "@/lib/file-size";
import workflowStyles from "@/app/request-workflow.module.css";
import styles from "./deadline.module.css";

export type DeadlineMaterialView = {
  id: string;
  title: string;
  kind: DeadlineMaterialKind;
  url: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  uploadedByName: string;
  uploadedByRole: DeadlineMaterialUploaderRole;
  uploadedAt: Date;
};

const kindIcons: Record<DeadlineMaterialKind, typeof Page> = {
  PDF: Page,
  DOC: MultiplePages,
  SLIDES: Presentation,
  LINK: LinkIcon,
  OTHER: EmptyPage,
};

function MaterialCard({ material }: { material: DeadlineMaterialView }) {
  const Icon = kindIcons[material.kind];
  const fileHref = material.fileName
    ? `/api/deadline-materials/${encodeURIComponent(material.id)}`
    : null;
  const openHref = fileHref ?? getSafeExternalUrl(material.url);
  const meta = [
    deadlineMaterialKindLabels[material.kind],
    material.sizeBytes === null ? null : formatFileSize(material.sizeBytes),
  ].filter(Boolean);

  return (
    <li className={styles.material}>
      <span className={styles.materialIcon}>
        <Icon
          aria-label={deadlineMaterialKindLabels[material.kind]}
          role="img"
          strokeWidth={1.8}
        />
      </span>
      <div className={styles.materialInfo}>
        <h3>{material.title}</h3>
        <p>{meta.join(" · ")}</p>
        <p>
          {material.uploadedByName},{" "}
          {deadlineUploaderRoleLabels[material.uploadedByRole]}
        </p>
        <p>
          <time dateTime={material.uploadedAt.toISOString()}>
            {formatUniversityDateTime(material.uploadedAt, {
              dateStyle: "long",
            })}
          </time>
        </p>
      </div>
      <div className={styles.materialActions}>
        {openHref && (
          <a
            aria-label={`Открыть: ${material.title} (в новой вкладке)`}
            className={workflowStyles.secondaryButton}
            href={openHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Открыть
          </a>
        )}
        {fileHref && (
          <a
            aria-label={`Скачать: ${material.title}`}
            className={workflowStyles.secondaryButton}
            download
            href={`${fileHref}?download=1`}
          >
            Скачать
          </a>
        )}
      </div>
    </li>
  );
}

export function DeadlineMaterials({
  materials,
}: {
  materials: readonly DeadlineMaterialView[];
}) {
  return (
    <section aria-labelledby="materials" className={styles.panel}>
      <h2 id="materials">Материалы</h2>
      {materials.length > 0 ? (
        <ul className={styles.materials}>
          {materials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </ul>
      ) : (
        <EmptyState
          className={styles.emptyMaterials}
          illustration="documents"
          title="Преподаватель пока не прикрепил материалы"
        />
      )}
    </section>
  );
}
