const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDemoDate(value: string | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError("DEMO_NOW должен содержать корректную дату.");
  }
  return parsed;
}

export const DEMO_NOW = parseDemoDate(process.env.DEMO_NOW);

export function getDemoNow(now = new Date()): Date {
  return DEMO_NOW ? new Date(DEMO_NOW) : now;
}

export function addDemoDays(days: number, now = getDemoNow()): Date {
  if (!Number.isInteger(days)) {
    throw new RangeError("Количество дней должно быть целым числом.");
  }

  const result = new Date(now);
  result.setTime(result.getTime() + days * DAY_IN_MILLISECONDS);
  return result;
}
