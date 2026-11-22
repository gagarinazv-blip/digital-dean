"use client";

import { useCallback, useId, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import controls from "@/components/ui/controls.module.css";
import type {
  RequestCatalogEntry,
  RequestProfileSnapshot,
} from "@/lib/request-catalog";
import { NewRequestForm } from "./request-forms";

// crypto.randomUUID недоступен вне HTTPS и localhost.
function createRequestPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// Окно заказа справки: та же форма, что и на странице /requests/new.
export function RequestWindow({
  profile,
  services,
  serviceCode,
  triggerLabel,
  triggerClassName = controls.primary,
}: {
  profile: RequestProfileSnapshot;
  services: readonly RequestCatalogEntry[];
  serviceCode?: string;
  triggerLabel: string;
  triggerClassName?: string;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [publicId, setPublicId] = useState("");
  const [status, setStatus] = useState({ isDirty: false, pending: false });
  const updateStatus = useCallback(
    (next: { isDirty: boolean; pending: boolean }) => setStatus(next),
    [],
  );

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={triggerClassName}
        onClick={() => {
          setPublicId(createRequestPublicId());
          setOpen(true);
        }}
        type="button"
      >
        {triggerLabel}
      </button>
      <Drawer
        description="Профильные сведения подставятся автоматически."
        eyebrow="Документы и заявки"
        footer={(requestClose) => (
          <>
            <button
              className={controls.secondary}
              disabled={status.pending}
              onClick={requestClose}
              type="button"
            >
              Отмена
            </button>
            <button
              aria-busy={status.pending}
              className={controls.primary}
              disabled={status.pending}
              form={formId}
              type="submit"
            >
              {status.pending ? "Отправляется…" : "Отправить заявку"}
            </button>
          </>
        )}
        isBusy={status.pending}
        isDirty={status.isDirty && !status.pending}
        mode="full"
        onClose={() => setOpen(false)}
        open={open}
        title="Новая заявка"
      >
        <NewRequestForm
          formId={formId}
          initialValues={
            serviceCode
              ? { catalogCode: serviceCode, fields: {}, description: "" }
              : undefined
          }
          onStatusChange={updateStatus}
          profile={profile}
          publicId={publicId}
          services={services}
        />
      </Drawer>
    </>
  );
}
