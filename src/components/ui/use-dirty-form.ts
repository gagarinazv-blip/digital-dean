"use client";

import { useCallback, useRef, useState, type RefObject } from "react";

function serialize(form: HTMLFormElement): string {
  return JSON.stringify(
    [...new FormData(form).entries()].map(([name, value]) => [
      name,
      typeof value === "string" ? value : `${value.name}:${value.size}`,
    ]),
  );
}

// Сравнивает форму с её исходным состоянием, чтобы возврат к прежним
// значениям не считался изменением.
export function useDirtyForm(): {
  formRef: (form: HTMLFormElement | null) => void;
  formElementRef: RefObject<HTMLFormElement | null>;
  isDirty: boolean;
  checkDirty: () => void;
} {
  const formElementRef = useRef<HTMLFormElement | null>(null);
  const initialRef = useRef<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const formRef = useCallback((form: HTMLFormElement | null) => {
    formElementRef.current = form;
    initialRef.current = form ? serialize(form) : null;
    setIsDirty(false);
  }, []);

  const checkDirty = useCallback(() => {
    const form = formElementRef.current;
    setIsDirty(form !== null && serialize(form) !== initialRef.current);
  }, []);

  return { formRef, formElementRef, isDirty, checkDirty };
}
