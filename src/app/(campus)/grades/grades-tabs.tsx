"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
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
  const hasCalculator = calculator !== null;
  const [activeTab, setActiveTab] = useState<GradesTab>(
    initialTab === "calculator" && hasCalculator ? "calculator" : "results",
  );
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!hasCalculator) return;
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    if (!tabs?.length) return;

    const currentIndex = Array.from(tabs).indexOf(event.currentTarget);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (nextIndex < 0) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    setActiveTab(
      nextTab.id === "grades-calculator-tab" ? "calculator" : "results",
    );
  };

  return (
    <div className={styles.tabSection}>
      <div
        className={`${styles.tabs} ${
          activeTab === "calculator" ? styles.tabsCalculatorActive : ""
        } ${hasCalculator ? "" : styles.tabsSingle}`}
        role="tablist"
        aria-label="Разделы оценок"
      >
        <button
          aria-controls="grades-results-panel"
          aria-selected={activeTab === "results"}
          className={styles.tab}
          id="grades-results-tab"
          tabIndex={activeTab === "results" ? 0 : -1}
          onKeyDown={handleTabKeyDown}
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
            tabIndex={activeTab === "calculator" ? 0 : -1}
            onKeyDown={handleTabKeyDown}
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
