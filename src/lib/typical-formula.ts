import type { ControlType } from "@/generated/prisma/enums";
import {
  standardGradeScale,
  type GradeFormula,
  type GradeFormulaComponent,
} from "@/lib/grade-formula";

type TypicalComponent = readonly [code: string, name: string, weight: number];

// Обычное распределение баллов по виду контроля. Вес равен максимуму баллов.
const typicalComponents: Record<ControlType, readonly TypicalComponent[]> = {
  EXAM: [
    ["midterm", "Контрольные работы", 25],
    ["practice", "Практические и лабораторные", 30],
    ["activity", "Посещаемость и активность", 10],
    ["final", "Экзамен", 35],
  ],
  CREDIT: [
    ["midterm", "Контрольные работы", 30],
    ["practice", "Практические задания", 40],
    ["activity", "Посещаемость и активность", 10],
    ["final", "Зачёт", 20],
  ],
  DIFFERENTIATED_CREDIT: [
    ["midterm", "Контрольные работы", 25],
    ["practice", "Практические и лабораторные", 35],
    ["activity", "Посещаемость и активность", 10],
    ["final", "Дифференцированный зачёт", 30],
  ],
  COURSEWORK: [
    ["plan", "План и работа с руководителем", 15],
    ["text", "Текст работы", 45],
    ["result", "Практический результат", 15],
    ["final", "Защита", 25],
  ],
  OTHER: [
    ["practice", "Текущая работа", 60],
    ["final", "Итоговая работа", 40],
  ],
};

/**
 * Схема для калькулятора, когда преподаватель ещё не опубликовал формулу.
 * В журнал и официальные расчёты она не попадает.
 */
export function getTypicalFormula(subject: {
  id: string;
  name: string;
  controlType: ControlType;
  semesterCode: string;
}): GradeFormula {
  return {
    subjectId: subject.id,
    semesterCode: subject.semesterCode,
    subjectName: subject.name,
    source: "TYPICAL",
    roundingMode: "HALF_UP_TO_INTEGER",
    components: typicalComponents[subject.controlType].map(
      ([code, name, weight], index): GradeFormulaComponent => ({
        code,
        name,
        weight,
        maxPoints: weight,
        order: index + 1,
        requiredForFinal: code === "final",
      }),
    ),
    scale: standardGradeScale,
    sourceNote:
      "Формула дисциплины ещё не опубликована. Расчёт по типовой схеме для этого вида контроля.",
  };
}
