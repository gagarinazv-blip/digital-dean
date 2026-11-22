export function formatRequestNumber(id: number): string {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new RangeError("Номер заявки должен быть положительным целым числом.");
  }

  return `№ ${id}`;
}
