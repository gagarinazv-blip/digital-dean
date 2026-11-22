// После слова нужен разделитель или номер: «Кабельная» и «Аудит» — не префиксы.
const roomPrefix = /^(?:ауд(?:итория)?|каб(?:инет)?)(?:\.\s*|\s+|(?=\d))/i;
const onlinePattern = /онлайн|дистан|вебинар|zoom|teams|телемост/i;
const urlPattern = /https?:\/\/[^\s,;]+/i;

/**
 * Подпись аудитории. Префикс «ауд.» добавляется один раз и только если его нет
 * в данных: «101» → «ауд. 101», «МО-101, ауд. 101» остаётся как есть.
 * Пустое значение — null, чтобы шаблоны не выводили лишний разделитель.
 */
export function formatRoom(room: string | null | undefined): string | null {
  const parts = (room ?? "")
    .replace(urlPattern, "")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // «ауд. ауд. 101» и повторы частей встречаются в загруженных данных.
  const cleaned = parts
    .map((part) => {
      let rest = part;
      let prefix = "";
      for (let match = roomPrefix.exec(rest); match; match = roomPrefix.exec(rest)) {
        prefix ||= match[0].trim();
        rest = rest.slice(match[0].length);
      }
      return rest ? [prefix, rest].filter(Boolean).join(" ") : "";
    })
    .filter((part, index, all) => part && all.indexOf(part) === index);

  if (cleaned.length === 0) return urlPattern.test(room ?? "") ? "Онлайн" : null;
  const label = cleaned.join(", ");
  if (onlinePattern.test(label) || cleaned.some((part) => roomPrefix.test(part))) {
    return label;
  }
  return [
    ...cleaned.slice(0, -1),
    `ауд. ${cleaned[cleaned.length - 1]}`,
  ].join(", ");
}

/** То же с заглавной буквы — для отдельной строки или бейджа. */
export function formatRoomTitle(room: string | null | undefined): string | null {
  const label = formatRoom(room);
  return label ? `${label.charAt(0).toLocaleUpperCase("ru-RU")}${label.slice(1)}` : null;
}

/** Ссылка на подключение, если она указана вместо аудитории или в примечании. */
export function getOnlineLink(
  ...sources: (string | null | undefined)[]
): string | null {
  for (const source of sources) {
    const match = urlPattern.exec(source ?? "");
    if (match) return match[0];
  }
  return null;
}

/** Соединяет подписи, пропуская пустые: без лишних разделителей. */
export function joinDetails(
  ...parts: (string | null | undefined | false)[]
): string {
  return parts.filter(Boolean).join(" · ");
}
