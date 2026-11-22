/** Числовая оценка 2–5; зачёты и пустые значения не учитываются. */
export function getNumericGrade(value: string | undefined): number | null {
  if (!value || !/^[2-5](?:[.,]\d+)?$/.test(value.trim())) return null;
  const grade = Number(value.replace(",", "."));
  return Number.isFinite(grade) && grade >= 2 && grade <= 5 ? grade : null;
}

export function getAverageGrade(
  values: readonly (string | undefined)[],
): number | null {
  const grades = values
    .map(getNumericGrade)
    .filter((grade): grade is number => grade !== null);
  return grades.length > 0
    ? grades.reduce((total, grade) => total + grade, 0) / grades.length
    : null;
}
