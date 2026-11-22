import { useId } from "react";

export const BRAND_NAME = "АКСИУМ";
export const BRAND_TAGLINE = "Цифровая платформа университета";

/**
 * Знак «а» с кольцом. Буква берёт currentColor, кольцо — акцентные токены,
 * поэтому знак работает и на светлом, и на тёмном фоне. Просвет --brand-halo
 * цвета подложки отделяет кольцо от буквы, чтобы они не слипались в мелком размере.
 */
export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="100 106 330 330"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="107"
          x2="422"
          y1="330"
          y2="262"
        >
          <stop offset="0" stopColor="var(--color-accent-blue)" />
          <stop offset="0.52" stopColor="var(--color-accent-mix)" />
          <stop offset="0.9" stopColor="var(--color-accent-yellow)" />
        </linearGradient>
      </defs>
      <path
        d="M137 223c28-63 85-95 145-95 70 0 108 44 109 122-19-7-41-9-61-9 0-41-20-68-68-68-47 0-90 17-125 50Z"
        fill="currentColor"
      />
      <path
        d="M330 252c22-1 44 3 62 12v134c0 6 4 13-1 13h-35c-16 0-26-11-26-29v-52c-20 50-60 84-108 84-42 0-74-26-74-64 2 10 12 17 39 17 60 0 129-49 143-115Z"
        fill="currentColor"
      />
      <path
        d="M148 361c-24-3-41-15-41-33 0-40 108-87 223-87 58 0 92 11 92 35 0 12-12 24-29 32v-14c5-3 8-10 6-16-3-16-29-26-69-26-95 0-180 48-182 93v16Z"
        fill={`url(#${gradientId})`}
        paintOrder="stroke"
        stroke="var(--brand-halo, none)"
        strokeWidth="14"
      />
    </svg>
  );
}
