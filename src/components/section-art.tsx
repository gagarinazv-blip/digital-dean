import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./section-art.module.css";

export type SectionIllustration =
  | "schedule"
  | "tasks"
  | "digest"
  | "grades"
  | "documents"
  | "opportunities"
  | "notifications"
  | "profile"
  | "calm"
  | "requests"
  | "students"
  | "achievements"
  | "events"
  | "programs"
  | "certificates";

/** Порядок появления: шаг задержки анимации. */
function step(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

/** Четырёхконечная звезда из графических элементов бренда. */
function Star({ x, y, size = 9, i = 6 }: { x: number; y: number; size?: number; i?: number }) {
  const s = size;
  const k = size * 0.16;
  return (
    <path
      className={styles.star}
      d={`M${x} ${y - s}Q${x + k} ${y - k} ${x + s} ${y}Q${x + k} ${y + k} ${x} ${y + s}Q${x - k} ${y + k} ${x - s} ${y}Q${x - k} ${y - k} ${x} ${y - s}Z`}
      style={step(i)}
    />
  );
}

/** Строка текста на листе. */
function Line({ x, y, w, i = 1 }: { x: number; y: number; w: number; i?: number }) {
  return (
    <path className={styles.line} d={`M${x} ${y}h${w}`} pathLength={1} style={step(i)} />
  );
}

const drawings: Record<SectionIllustration, ReactNode> = {
  // Листок календаря заполняется днями.
  schedule: (
    <>
      <rect className={styles.paper} height="92" rx="13" width="88" x="56" y="30" />
      <path className={styles.wine} d="M56 52V43a13 13 0 0 1 13-13h62a13 13 0 0 1 13 13v9Z" />
      <path className={styles.ink} d="M78 23v13M122 23v13" />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2, 3].map((column) => (
          <rect
            className={`${styles.pop} ${
              row === 1 && column === 1
                ? styles.wine
                : row === 0 && column === 3
                  ? styles.yellow
                  : row === 2 && column === 2
                    ? styles.blue
                    : styles.mist
            }`}
            height="12"
            key={`${row}-${column}`}
            rx="4"
            style={step(1 + row + column)}
            width="12"
            x={66 + column * 18.5}
            y={62 + row * 18}
          />
        )),
      )}
      <Star x={158} y={34} />
    </>
  ),
  // Пункты списка отмечаются по очереди.
  tasks: (
    <>
      <rect className={styles.paper} height="98" rx="13" width="78" x="61" y="28" />
      <rect className={styles.wine} height="15" rx="7.5" width="34" x="83" y="20" />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect
            className={row === 2 ? styles.yellow : styles.mist}
            height="15"
            rx="5"
            width="15"
            x="72"
            y={50 + row * 23}
          />
          <path
            className={styles.tick}
            d={`M75.5 ${57.5 + row * 23}l3 3.2 5.4-6.2`}
            pathLength={1}
            style={step(2 + row * 2)}
          />
          <Line i={1 + row} w={row === 1 ? 26 : 34} x={95} y={57.5 + row * 23} />
        </g>
      ))}
      <Star x={46} y={44} i={8} />
    </>
  ),
  // Разворот газеты раскрывается.
  digest: (
    <>
      <path className={styles.paper} d="M100 44C86 34 66 33 48 38v74c18-5 38-4 52 6Z" />
      <g className={styles.page}>
        <path className={styles.paper} d="M100 44c14-10 34-11 52-6v74c-18-5-38-4-52 6Z" />
        <rect className={styles.blue} height="22" rx="5" width="32" x="111" y="54" />
        <Line i={5} w={32} x={111} y={88} />
        <Line i={6} w={22} x={111} y={98} />
      </g>
      <path className={styles.wineStroke} d="M58 56c10-2 20-1 31 3" pathLength={1} style={step(1)} />
      <path className={styles.line} d="M58 70c10-2 20-1 31 3" pathLength={1} style={step(2)} />
      <path className={styles.line} d="M58 82c10-2 20-1 31 3" pathLength={1} style={step(3)} />
      <path className={styles.line} d="M58 94c7-1.4 14-1 21 .6" pathLength={1} style={step(4)} />
      <Star x={140} y={24} i={7} />
    </>
  ),
  // Столбцы растут, линия успеха прочерчивается до звезды.
  grades: (
    <>
      <path className={styles.ink} d="M46 122h108" />
      {[
        [56, 34, styles.mist],
        [80, 50, styles.blue],
        [104, 44, styles.yellow],
        [128, 70, styles.wine],
      ].map(([x, height, tone], index) => (
        <rect
          className={`${styles.growUp} ${tone}`}
          height={height}
          key={x}
          rx="6"
          style={step(index)}
          width="17"
          x={x}
          y={120 - Number(height)}
        />
      ))}
      <path className={styles.wineStroke} d="M52 80C74 76 82 52 100 56s24-16 44-28" pathLength={1} style={step(4)} />
      <Star x={150} y={24} i={9} />
    </>
  ),
  // Листы раскладываются веером, сверху ставится печать.
  documents: (
    <>
      <rect className={`${styles.paperBlue} ${styles.fanLeft}`} height="84" rx="11" width="64" x="64" y="34" />
      <rect className={`${styles.paperYellow} ${styles.fanRight}`} height="84" rx="11" width="64" x="72" y="34" />
      <rect className={styles.paper} height="88" rx="11" width="66" x="67" y="32" />
      <Line i={2} w={30} x={79} y={50} />
      <Line i={3} w={42} x={79} y={63} />
      <Line i={4} w={42} x={79} y={76} />
      <Line i={5} w={18} x={79} y={89} />
      <g className={styles.stamp}>
        <circle className={styles.wine} cx="117" cy="104" r="14" />
        <path className={styles.lightStroke} d="m111 104 4.2 4.4 7.6-8.6" />
      </g>
      <Star x={48} y={40} i={8} />
    </>
  ),
  // Арка открывается, из неё поднимается звезда.
  opportunities: (
    <>
      <path className={styles.wine} d="M60 122V74a40 40 0 0 1 80 0v48Z" />
      <path className={styles.paperArch} d="M72 122V75a28 28 0 0 1 56 0v47Z" />
      <path className={`${styles.yellow} ${styles.growUp}`} d="M72 122V92c12-8 44-8 56 0v30Z" style={step(1)} />
      <path className={styles.ink} d="M44 122h112" />
      <path className={styles.inkThin} d="M52 130h96" />
      <g className={styles.rise}>
        <Star i={4} size={15} x={100} y={76} />
      </g>
      <Star i={8} size={7} x={152} y={40} />
    </>
  ),
  // Колокольчик качается, от него идут волны.
  notifications: (
    <>
      <path className={styles.wave} d="M58 46c-8 10-9 26-3 38" pathLength={1} style={step(3)} />
      <path className={styles.wave} d="M142 46c8 10 9 26 3 38" pathLength={1} style={step(3)} />
      <g className={styles.swing}>
        <path className={styles.inkThin} d="M100 28v8" />
        <circle className={styles.yellow} cx="100" cy="114" r="9" />
        <path className={styles.wine} d="M100 34c19 0 30 14 30 33v18c0 8 4 13 9 18 2 2 1 5-2 5H63c-3 0-4-3-2-5 5-5 9-10 9-18V67c0-19 11-33 30-33Z" />
        <path className={styles.shine} d="M83 68c0-10 5-17 13-19" />
      </g>
      <Star x={152} y={32} />
    </>
  ),
  // Карточка студента: портрет и строки.
  profile: (
    <>
      <rect className={styles.paper} height="76" rx="14" width="108" x="46" y="40" />
      <g className={styles.pop} style={step(1)}>
        <circle className={styles.blue} cx="76" cy="78" r="21" />
        <circle className={styles.wine} cx="76" cy="72" r="8" />
        <path className={styles.wine} d="M62 92c2-8 7-12 14-12s12 4 14 12a21 21 0 0 1-28 0Z" />
      </g>
      <Line i={3} w={36} x={106} y={64} />
      <Line i={4} w={28} x={106} y={77} />
      <rect className={`${styles.yellow} ${styles.pop}`} height="12" rx="6" style={step(6)} width="30" x="106" y="89" />
      <Star x={158} y={34} i={7} />
    </>
  ),
  // Спокойный день: солнце над горизонтом.
  calm: (
    <>
      <circle className={`${styles.yellow} ${styles.sun}`} cx="100" cy="74" r="32" />
      <path className={styles.blue} d="M38 106c18-18 40-18 62-4s42 10 62-4v24H38Z" />
      <path className={styles.paperHill} d="M38 112c22-10 44-6 64 2s40 6 60-4v22H38Z" />
      <path className={styles.ink} d="M38 132h124" />
      <Star x={146} y={42} />
      <Star i={8} size={6} x={54} y={58} />
    </>
  ),
  // Письмо выходит из конверта.
  requests: (
    <>
      <path className={styles.paperBlue} d="M48 72 100 38l52 34v46a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8Z" />
      <g className={styles.letter}>
        <rect className={styles.paper} height="66" rx="9" width="76" x="62" y="38" />
        <Line i={4} w={30} x={74} y={54} />
        <Line i={5} w={52} x={74} y={67} />
      </g>
      <path className={styles.paperFront} d="M48 74l52 32 52-32v44a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8Z" />
      <path className={styles.wineStroke} d="m50 124 38-26M150 124l-38-26" pathLength={1} style={step(2)} />
      <Star x={156} y={42} />
    </>
  ),
  students: (
    <>
      {[
        [62, 88, styles.blue, 0],
        [138, 88, styles.yellow, 1],
      ].map(([x, y, tone, index]) => (
        <g className={styles.pop} key={x} style={step(Number(index) + 1)}>
          <circle className={String(tone)} cx={Number(x)} cy={Number(y) - 24} r="14" />
          <path className={String(tone)} d={`M${Number(x) - 24} 124c0-20 10-30 24-30s24 10 24 30Z`} />
        </g>
      ))}
      <g className={styles.pop} style={step(3)}>
        <circle className={styles.wine} cx="100" cy="54" r="18" />
        <path className={styles.wineEdge} d="M68 126c0-28 14-44 32-44s32 16 32 44Z" />
      </g>
      <path className={styles.ink} d="M36 126h128" />
      <Star x={146} y={36} />
    </>
  ),
  achievements: (
    <>
      <path className={styles.inkThin} d="M72 46H56c0 18 8 28 20 30M128 46h16c0 18-8 28-20 30" />
      <path className={styles.wine} d="M70 34h60v28c0 20-12 32-30 32S70 82 70 62Z" />
      <path className={styles.ink} d="M100 94v18" />
      <rect className={`${styles.yellow} ${styles.growUp}`} height="14" rx="5" style={step(1)} width="52" x="74" y="112" />
      <g className={styles.lightStar}>
        <Star i={4} size={13} x={100} y={62} />
      </g>
      <Star i={7} size={7} x={152} y={34} />
    </>
  ),
  events: (
    <>
      <g className={styles.tilt}>
        <path className={styles.paper} d="M46 56a9 9 0 0 1 9-9h90a9 9 0 0 1 9 9v12a12 12 0 0 0 0 24v12a9 9 0 0 1-9 9H55a9 9 0 0 1-9-9V92a12 12 0 0 0 0-24Z" />
        <path className={styles.dash} d="M122 52v56" />
        <rect className={styles.wine} height="18" rx="5" width="36" x="66" y="60" />
        <Line i={3} w={42} x={66} y={90} />
        <Line i={4} w={26} x={66} y={101} />
      </g>
      <Star x={138} y={80} size={10} i={5} />
      <Star x={152} y={30} size={7} i={8} />
    </>
  ),
  programs: (
    <>
      <path className={styles.ink} d="M82 48v-8a7 7 0 0 1 7-7h22a7 7 0 0 1 7 7v8" />
      <rect className={styles.paper} height="74" rx="13" width="108" x="46" y="48" />
      <path className={styles.wine} d="M46 84V61a13 13 0 0 1 13-13h82a13 13 0 0 1 13 13v23c-32 14-76 14-108 0Z" />
      <rect className={`${styles.yellow} ${styles.pop}`} height="18" rx="6" style={step(3)} width="22" x="89" y="82" />
      <Star x={158} y={36} />
    </>
  ),
  certificates: (
    <>
      <rect className={styles.paper} height="80" rx="12" width="112" x="44" y="34" />
      <Line i={1} w={48} x={76} y={54} />
      <Line i={2} w={76} x={62} y={70} />
      <Line i={3} w={44} x={62} y={84} />
      <g className={styles.stamp}>
        <path className={styles.wine} d="m122 104-6 26 12-7 12 7-6-26Z" />
        <circle className={styles.yellow} cx="128" cy="98" r="17" />
      </g>
      <Star i={6} size={9} x={128} y={98} />
      <Star i={8} size={7} x={40} y={36} />
    </>
  ),
};

/**
 * Иллюстрации в стиле логотипа: плоский предмет, тонкая линия и кольцо вокруг.
 * Задняя дуга кольца идёт за предметом, передняя — перед ним.
 */
export function SectionArt({
  name,
  className,
}: {
  name: SectionIllustration;
  className?: string;
}) {
  const gradientId = useId();
  const stroke = `url(#${gradientId})`;
  return (
    <svg
      aria-hidden="true"
      className={[styles.art, className].filter(Boolean).join(" ")}
      data-section-art={name}
      fill="none"
      focusable="false"
      viewBox="0 8 200 142"
    >
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id={gradientId} x1="12" x2="188" y1="104" y2="64">
          <stop offset="0" stopColor="var(--color-ring-blue)" />
          <stop offset="0.55" stopColor="var(--color-accent-mix)" />
          <stop offset="1" stopColor="var(--color-ring-yellow)" />
        </linearGradient>
      </defs>
      <path
        className={styles.ring}
        d="M12.3 99.4C9.6 84.6 46.6 64.8 94.9 55.2s89.7-5.200 92.800 9.600"
        pathLength={1}
        stroke={stroke}
      />
      {drawings[name]}
      <path
        className={styles.ringFront}
        d="M187.700 64.800c2.700 14.800-34.300 34.600-82.600 44.200s-89.700 5.200-92.800-9.600"
        pathLength={1}
        stroke={stroke}
      />
    </svg>
  );
}
