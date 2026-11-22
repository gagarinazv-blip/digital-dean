import type {
  OpportunityStatus,
  OpportunityType,
} from "@/generated/prisma/enums";
import {
  opportunityDirections,
} from "@/lib/opportunity-catalog";
import {
  parseRequirements,
  type OpportunityRequirement,
} from "@/lib/opportunities";
import {
  OpportunityTypeFields,
  RequiredDocumentsEditor,
} from "./opportunity-form-controls";
import styles from "./opportunities.module.css";

type OpportunityFormInitial = {
  id: number;
  title: string;
  type: OpportunityType;
  organizer: string;
  shortDescription: string;
  description: string;
  requirements: string;
  deadline: Date;
  allowLateRequests: boolean;
  lateRequestsUntil: Date | null;
  directions: OpportunityFormValueDirection[];
  minCourse: number | null;
  maxCourse: number | null;
  allowedFaculties: string[];
  format: "OFFLINE" | "ONLINE" | "HYBRID";
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  cost: "FREE" | "PAID";
  costNote: string | null;
  officialUrl: string | null;
  requiredDocuments: unknown;
  details: unknown;
  status: OpportunityStatus;
};

type OpportunityFormValueDirection =
  (typeof opportunityDirections)[number]["value"];

function dateTimeLocal(value: Date | null | undefined): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function asDetails(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    ),
  );
}

export function OpportunityForm({
  action,
  faculties,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  faculties: string[];
  initial?: OpportunityFormInitial;
  submitLabel: string;
}) {
  const documents: OpportunityRequirement[] = parseRequirements(
    initial?.requiredDocuments,
  );
  const directions = new Set(initial?.directions ?? []);

  return (
    <form action={action} className={styles.form}>
      {initial && (
        <input type="hidden" name="opportunityId" value={initial.id} />
      )}
      <label>
        Название
        <input name="title" maxLength={120} required defaultValue={initial?.title} />
      </label>
      <OpportunityTypeFields
        initialType={initial?.type ?? "CONFERENCE"}
        initialDetails={asDetails(initial?.details)}
      />
      <label>
        Организатор
        <input name="organizer" maxLength={160} required defaultValue={initial?.organizer} />
      </label>
      <label>
        Краткое описание
        <textarea
          name="shortDescription"
          maxLength={200}
          defaultValue={initial?.shortDescription}
        />
      </label>
      <label>
        Описание
        <textarea
          name="description"
          maxLength={10000}
          required
          defaultValue={initial?.description}
        />
      </label>
      <label>
        Требования
        <textarea
          name="requirements"
          maxLength={5000}
          required
          defaultValue={initial?.requirements}
        />
      </label>
      <label>
        Дедлайн приёма заявок
        <input
          name="deadline"
          type="datetime-local"
          required
          defaultValue={dateTimeLocal(initial?.deadline)}
        />
      </label>
      <input type="hidden" name="allowLateRequests" value="false" />
      <label className={styles.checkLabel}>
        <input
          name="allowLateRequests"
          type="checkbox"
          value="true"
          defaultChecked={initial?.allowLateRequests ?? false}
        />
        Принимать индивидуальные запросы после дедлайна
      </label>
      <label>
        Принимать индивидуальные запросы до
        <input
          name="lateRequestsUntil"
          type="datetime-local"
          defaultValue={dateTimeLocal(initial?.lateRequestsUntil)}
        />
      </label>
      <label>
        Формат
        <select name="format" defaultValue={initial?.format ?? "OFFLINE"}>
          <option value="OFFLINE">Очно</option>
          <option value="ONLINE">Онлайн</option>
          <option value="HYBRID">Гибрид</option>
        </select>
      </label>
      <label>
        Стоимость
        <select name="cost" defaultValue={initial?.cost ?? "FREE"}>
          <option value="FREE">Бесплатно</option>
          <option value="PAID">Платно</option>
        </select>
      </label>
      <label>
        Пояснение стоимости
        <input name="costNote" maxLength={200} defaultValue={initial?.costNote ?? ""} />
      </label>
      <label>
        Место проведения
        <input name="location" maxLength={160} defaultValue={initial?.location ?? ""} />
      </label>
      <label>
        Начало
        <input
          name="startsAt"
          type="datetime-local"
          defaultValue={dateTimeLocal(initial?.startsAt)}
        />
      </label>
      <label>
        Окончание
        <input
          name="endsAt"
          type="datetime-local"
          defaultValue={dateTimeLocal(initial?.endsAt)}
        />
      </label>
      <fieldset className={styles.checkFieldset}>
        <legend>Направления</legend>
        <div className={styles.checkGrid}>
          {opportunityDirections.map((direction) => (
            <label className={styles.checkLabel} key={direction.value}>
              <input
                type="checkbox"
                name="directions"
                value={direction.value}
                defaultChecked={directions.has(direction.value)}
              />
              {direction.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.courseGrid}>
        <label>
          Минимальный курс
          <select name="minCourse" defaultValue={initial?.minCourse ?? ""}>
            <option value="">Без ограничения</option>
            {[1, 2, 3, 4, 5, 6].map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </label>
        <label>
          Максимальный курс
          <select name="maxCourse" defaultValue={initial?.maxCourse ?? ""}>
            <option value="">Без ограничения</option>
            {[1, 2, 3, 4, 5, 6].map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className={styles.checkFieldset}>
        <legend>Факультеты</legend>
        <div className={styles.checkGrid}>
          {faculties.map((faculty) => (
            <label className={styles.checkLabel} key={faculty}>
              <input
                type="checkbox"
                name="allowedFaculties"
                value={faculty}
                defaultChecked={initial?.allowedFaculties.includes(faculty)}
              />
              {faculty}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Ссылка на официальную страницу (HTTP/HTTPS)
        <input
          name="officialUrl"
          type="url"
          maxLength={2048}
          placeholder="https://example.com/..."
          defaultValue={initial?.officialUrl ?? ""}
        />
      </label>
      <RequiredDocumentsEditor initialDocuments={documents} />
      <label>
        Статус
        <select name="status" defaultValue={initial?.status ?? "DRAFT"}>
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликовано</option>
          <option value="ARCHIVED">Архив</option>
        </select>
      </label>
      <button className={styles.submitButton} type="submit">{submitLabel}</button>
    </form>
  );
}
