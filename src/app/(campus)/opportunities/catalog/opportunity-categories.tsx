"use client";

import { useId } from "react";
import Link from "next/link";
import { BottomSheet } from "@/components/bottom-sheet";
import type { OpportunityType } from "@/generated/prisma/enums";
import styles from "./opportunities.module.css";

export type OpportunityCategoryItem = {
  type: OpportunityType;
  href: string;
  fullLabel: string;
  shortLabel: string;
  iconPath: string;
  count: number;
};

export type OpportunityCategoryGroup = {
  id: string;
  label: string;
  count: number;
  categories: OpportunityCategoryItem[];
};

function opportunityCount(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const noun =
    mod100 >= 11 && mod100 <= 14
      ? "возможностей"
      : mod10 === 1
        ? "возможность"
        : mod10 >= 2 && mod10 <= 4
          ? "возможности"
          : "возможностей";
  return `${count} ${noun}`;
}

function CategoryPill({
  href,
  fullLabel,
  shortLabel,
  iconPath,
  count,
  selected,
  all = false,
}: {
  href: string;
  fullLabel: string;
  shortLabel: string;
  iconPath: string;
  count: number;
  selected: boolean;
  all?: boolean;
}) {
  const selection = selected ? ", выбрано" : "";
  return (
    <Link
      aria-current={selected ? "true" : undefined}
      aria-label={`${fullLabel}, ${opportunityCount(count)}${selection}`}
      className={`${styles.categoryPill} ${all ? styles.allCategoryPill : ""} ${selected ? styles.categoryPillActive : ""} ${count === 0 ? styles.categoryPillEmpty : ""}`}
      href={href}
      onKeyDown={(event) => {
        if (event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      scroll={false}
      title={fullLabel}
    >
      <svg
        aria-hidden="true"
        className={styles.categoryIcon}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
      >
        <path d={iconPath} />
      </svg>
      <span className={styles.categoryLabel}>{shortLabel}</span>
      <span aria-hidden="true" className={styles.categoryCount}>
        {count}
      </span>
    </Link>
  );
}

function CategoryGroups({
  allHref,
  allIconPath,
  allCount,
  groups,
  selectedType,
  idPrefix,
}: {
  allHref: string;
  allIconPath: string;
  allCount: number;
  groups: OpportunityCategoryGroup[];
  selectedType: OpportunityType | null;
  idPrefix: string;
}) {
  return (
    <>
      <CategoryPill
        all
        count={allCount}
        fullLabel="Все возможности"
        href={allHref}
        iconPath={allIconPath}
        selected={selectedType === null}
        shortLabel="Все возможности"
      />
      {groups.map((group) => {
        const labelId = `${idPrefix}-${group.id}`;
        return (
          <section
            aria-labelledby={labelId}
            className={styles.categoryGroup}
            key={group.id}
            role="group"
          >
            <div className={styles.groupInfo}>
              <h3 id={labelId}>{group.label}</h3>
              <span>{opportunityCount(group.count)}</span>
            </div>
            <div className={styles.categoryPills}>
              {group.categories.map((category) => (
                <CategoryPill
                  count={category.count}
                  fullLabel={category.fullLabel}
                  href={category.href}
                  iconPath={category.iconPath}
                  key={category.type}
                  selected={selectedType === category.type}
                  shortLabel={category.shortLabel}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function OpportunityCategories({
  allHref,
  allIconPath,
  allCount,
  groups,
  selectedType,
  selectedLabel,
  selectedCount,
}: {
  allHref: string;
  allIconPath: string;
  allCount: number;
  groups: OpportunityCategoryGroup[];
  selectedType: OpportunityType | null;
  selectedLabel: string;
  selectedCount: number;
}) {
  const idPrefix = useId().replaceAll(":", "");

  return (
    <>
      <section
        aria-label="Категории возможностей"
        className={styles.desktopCategories}
      >
        <div className={styles.categoryCard}>
          <div className={styles.categoryHeader}>
            <h2>Категории</h2>
          </div>
          <div className={styles.allCategoryRow}>
            <CategoryPill
              all
              count={allCount}
              fullLabel="Все возможности"
              href={allHref}
              iconPath={allIconPath}
              selected={selectedType === null}
              shortLabel="Все возможности"
            />
            {selectedType && (
              <Link
                className={styles.resetCategory}
                href={allHref}
                scroll={false}
              >
                Сбросить категорию
              </Link>
            )}
          </div>
          <div className={styles.categoryRows}>
            {groups.map((group) => (
              <section
                aria-labelledby={`${idPrefix}-desktop-${group.id}`}
                className={styles.categoryGroup}
                key={group.id}
                role="group"
              >
                <div className={styles.groupInfo}>
                  <h3 id={`${idPrefix}-desktop-${group.id}`}>{group.label}</h3>
                  <span>{opportunityCount(group.count)}</span>
                </div>
                <div className={styles.categoryPills}>
                  {group.categories.map((category) => (
                    <CategoryPill
                      count={category.count}
                      fullLabel={category.fullLabel}
                      href={category.href}
                      iconPath={category.iconPath}
                      key={category.type}
                      selected={selectedType === category.type}
                      shortLabel={category.shortLabel}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.mobileCategories}>
        <BottomSheet
          title="Категории возможностей"
          triggerAriaLabel={`Категория: ${selectedLabel} (${selectedCount})`}
          triggerClassName={styles.mobileCategoryTrigger}
          triggerLabel={
            <>
              <span>Категория: {selectedLabel} ({selectedCount})</span>
              <svg
                aria-hidden="true"
                className={styles.mobileTriggerIcon}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </>
          }
        >
          <div className={styles.mobileSheetCategories}>
            <CategoryGroups
              allCount={allCount}
              allHref={allHref}
              allIconPath={allIconPath}
              groups={groups}
              idPrefix={`${idPrefix}-mobile`}
              selectedType={selectedType}
            />
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
