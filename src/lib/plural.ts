/** Форма слова по числу: 1 пара, 2 пары, 5 пар. */
export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  return last >= 2 && last <= 4 ? few : many;
}
