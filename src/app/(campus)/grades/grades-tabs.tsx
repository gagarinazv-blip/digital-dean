"use client";

import { useState, type ReactNode } from "react";
import styles from "./grades.module.css";

type GradesTab = "results" | "calculator";

export function GradesTabs({
  children,
  calculator,
  initialTab = "results",
}: {
  children: ReactNode;
  calculator: ReactNode | null;
  initialTab?: GradesTab;
}) {
  const [activeTab, setActiveTab] = useState<GradesTab>(initialTab);
  const hasCalculator = calculator !== null;

  return (
    <div className={styles.tabSection}>
      <div className={styles.tabs} role="tablist" aria-label="Разделы оценок">
        <button
          aria-controls="grades-results-panel"
          aria-selected={activeTab === "results"}
          className={styles.tab}
          id="grades-results-tab"
          onClick={() => setActiveTab("results")}
          role="tab"
          type="button"
        >
          Успеваемость
        </button>
        {hasCalculator && (
          <button
            aria-controls="grades-calculator-panel"
            aria-selected={activeTab === "calculator"}
            className={styles.tab}
            id="grades-calculator-tab"
            onClick={() => setActiveTab("calculator")}
            role="tab"
            type="button"
          >
            Калькулятор оценки
          </button>
        )}
      </div>
      <div
        aria-labelledby="grades-results-tab"
        className={styles.tabPanel}
        hidden={activeTab !== "results"}
        id="grades-results-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {children}
      </div>
      {hasCalculator && (
        <div
          aria-labelledby="grades-calculator-tab"
          className={styles.tabPanel}
          hidden={activeTab !== "calculator"}
          id="grades-calculator-panel"
          role="tabpanel"
          tabIndex={0}
        >
          {calculator}
        </div>
      )}
    </div>
  );
}
