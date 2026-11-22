"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { formatStudentPhoneInput } from "@/lib/phone-utils";

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  defaultValue?: string;
  inputType?: "tel" | "text";
  onValueChange?: (value: string) => void;
  value?: string;
};

export function PhoneInput({
  defaultValue,
  inputMode = "tel",
  inputType = "tel",
  onValueChange,
  value,
  ...inputProps
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    formatStudentPhoneInput(defaultValue ?? ""),
  );
  const displayValue =
    value === undefined ? uncontrolledValue : formatStudentPhoneInput(value);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const selection = event.currentTarget.selectionStart ?? rawValue.length;
    const rawDigits = rawValue.replace(/\D/g, "");
    const hasImplicitCountryCode =
      rawDigits.length > 0 &&
      !rawValue.trimStart().startsWith("+") &&
      !rawDigits.startsWith("7") &&
      !rawDigits.startsWith("8");
    const digitsBeforeCaret =
      rawValue.slice(0, selection).replace(/\D/g, "").length +
      (hasImplicitCountryCode ? 1 : 0);
    const formattedValue = formatStudentPhoneInput(rawValue);

    if (value === undefined) {
      setUncontrolledValue(formattedValue);
    }
    onValueChange?.(formattedValue);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input || (inputType === "text" && /[a-zа-я]/i.test(rawValue))) {
        return;
      }
      if (digitsBeforeCaret === 0) {
        const prefixLength = formattedValue.startsWith("+7") ? 2 : 1;
        input.setSelectionRange(prefixLength, prefixLength);
        return;
      }
      let digitCount = 0;
      let caret = formattedValue.length;
      for (let index = 0; index < formattedValue.length; index += 1) {
        if (/\d/.test(formattedValue[index])) {
          digitCount += 1;
          if (digitCount === digitsBeforeCaret) {
            caret = index + 1;
            break;
          }
        }
      }
      input.setSelectionRange(caret, caret);
    });
  }

  return (
    <input
      {...inputProps}
      inputMode={inputMode}
      onChange={handleChange}
      ref={inputRef}
      type={inputType}
      value={displayValue}
    />
  );
}
