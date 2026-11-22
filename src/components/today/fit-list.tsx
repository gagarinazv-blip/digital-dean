"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./today-lists.module.css";

/**
 * Список на всю высоту карточки: видны только строки, поместившиеся целиком.
 * Остальные CSS уводит в соседний столбец за край, а здесь они выключаются
 * из табуляции и чтения с экрана.
 */
export function FitList({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const left = list.getBoundingClientRect().left;
      for (const item of list.children) {
        (item as HTMLElement).inert =
          item.getBoundingClientRect().left > left + list.clientWidth / 2;
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  });

  return (
    <ul className={styles.rows} ref={listRef}>
      {children}
    </ul>
  );
}
