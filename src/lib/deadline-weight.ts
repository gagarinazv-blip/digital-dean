import type { DeadlineFormat } from "@/generated/prisma/enums";
import { gradeFormulas, type GradeFormulaComponent } from "@/lib/grade-formula";

export type DeadlineWeight = {
  /** Доля компонента в итоговой оценке, проценты. */
  percent: number;
  component: string;
  /** Компонент складывается из нескольких работ, своего веса у работы нет. */
  isShared: boolean;
  isDemonstration: boolean;
};

const kinds = [/контрольн/i, /лаборатор/i, /экзамен/i, /посещаем/i];

function getKind(text: string): number {
  return kinds.findIndex((pattern) => pattern.test(text));
}

function getNumber(text: string): string | null {
  return /(\d+)\s*$/.exec(text)?.[1] ?? null;
}

/**
 * Вес задания по формуле дисциплины. Сопоставляется только вид работы и номер:
 * если однозначного компонента нет, возвращается null, а не догадка.
 */
export function getDeadlineWeight(deadline: {
  disciplineId: string | null;
  title: string;
  format: DeadlineFormat;
}): DeadlineWeight | null {
  const formula = gradeFormulas.find(
    (item) => item.subjectId === deadline.disciplineId,
  );
  if (!formula) return null;

  const components: readonly GradeFormulaComponent[] = formula.components;
  const kind = getKind(
    deadline.format === "EXAM" ? "экзамен" : deadline.title,
  );
  const sameKind =
    kind === -1
      ? components.filter((component) => component.name === deadline.title)
      : components.filter((component) => getKind(component.name) === kind);
  const number = getNumber(deadline.title);
  const component =
    sameKind.length === 1
      ? sameKind[0]
      : sameKind.find((item) => number && getNumber(item.name) === number);
  if (!component) return null;

  return {
    percent: component.weight,
    component: component.name,
    isShared:
      deadline.format !== "EXAM" &&
      number !== null &&
      getNumber(component.name) !== number,
    isDemonstration: formula.source === "DEMONSTRATION",
  };
}
