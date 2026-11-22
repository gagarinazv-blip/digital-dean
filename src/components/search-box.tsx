"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { normalizeSearchText } from "@/lib/search/query";
import type { SearchGroup, SearchResult } from "@/lib/search/types";
import { SearchHighlight } from "@/components/search-highlight";
import styles from "./search-box.module.css";

function Magnifier() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === "string" &&
    typeof result.group === "string" &&
    typeof result.title === "string" &&
    typeof result.subtitle === "string" &&
    typeof result.href === "string"
  );
}

function isSearchPayload(
  value: unknown,
): value is { groups?: SearchGroup[]; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return (
    (payload.error === undefined || typeof payload.error === "string") &&
    (payload.groups === undefined ||
      (Array.isArray(payload.groups) &&
        payload.groups.every((group) => {
          if (!group || typeof group !== "object" || Array.isArray(group)) {
            return false;
          }
          const item = group as Record<string, unknown>;
          return (
            typeof item.name === "string" &&
            typeof item.hasMore === "boolean" &&
            Array.isArray(item.results) &&
            item.results.every(isSearchResult)
          );
        }))
    )
  );
}

export function SearchBox() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const terms = useMemo(
    () => normalizeSearchText(query.trim()).split(/\s+/).filter(Boolean),
    [query],
  );
  const results = useMemo(
    () => groups.flatMap((group) => group.results),
    [groups],
  );
  const isDropdownOpen = isOpen && query.trim().length > 0;
  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!isSearchPayload(payload)) {
          setError("Не удалось выполнить поиск. Попробуйте ещё раз.");
          setGroups([]);
          return;
        }
        if (!response.ok) {
          setError(
            payload.error ?? "Не удалось выполнить поиск. Попробуйте ещё раз.",
          );
          setGroups([]);
          return;
        }
        setGroups(payload.groups ?? []);
      } catch {
        if (controller.signal.aborted) return;
        setGroups([]);
        setError("Не удалось подключиться к поиску. Попробуйте ещё раз.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setMobileOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !isTypingTarget && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setMobileOpen(true);
        setIsOpen(true);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function navigateToSearch() {
    const value = query.trim();
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setMobileOpen(false);
        inputRef.current?.blur();
        toggleRef.current?.focus();
      }
      return;
    }
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        index <= 0 ? results.length - 1 : index - 1,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        router.push(results[activeIndex].href);
        setIsOpen(false);
        setMobileOpen(false);
      } else {
        navigateToSearch();
      }
    }
  }

  function renderResult(
    result: SearchResult,
    resultIndex: number,
  ) {
    return (
      <Link
        aria-selected={activeIndex === resultIndex}
        className={styles.result}
        href={result.href}
        id={`${listboxId}-option-${resultIndex}`}
        key={result.id}
        role="option"
        onClick={() => {
          setIsOpen(false);
          setMobileOpen(false);
        }}
        onMouseEnter={() => setActiveIndex(resultIndex)}
      >
        <strong>
          <SearchHighlight text={result.title} terms={terms} />
        </strong>
        <span>
          <SearchHighlight text={result.subtitle} terms={terms} />
        </span>
      </Link>
    );
  }

  return (
    <div
      className={styles.container}
      data-mobile-open={mobileOpen ? "true" : undefined}
      ref={containerRef}
    >
      <button
        aria-label={mobileOpen ? "Закрыть поиск" : "Открыть поиск"}
        aria-expanded={mobileOpen}
        aria-controls={listboxId}
        className={styles.mobileToggle}
        onClick={() => {
          const nextOpen = !mobileOpen;
          setMobileOpen(nextOpen);
          setIsOpen(nextOpen);
          if (nextOpen) {
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
        ref={toggleRef}
        type="button"
      >
        <Magnifier />
      </button>
      <label className={styles.field}>
        <Magnifier />
        <input
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isDropdownOpen}
          aria-label="Поиск по сайту"
          autoComplete="off"
          maxLength={100}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setGroups([]);
            setError("");
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Поиск по сайту"
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
        <span className={styles.shortcut} aria-hidden="true">
          /
        </span>
      </label>
      {isDropdownOpen && (
        <div className={styles.dropdown}>
          {loading && (
            <p className={styles.loading} aria-live="polite">
              <span aria-hidden="true" className={styles.spinner} />
              Ищем…
            </p>
          )}
          {!loading && error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {!loading && !error && query.trim().length === 1 && (
            <p className={styles.status}>Введите не менее двух символов.</p>
          )}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
            <p className={styles.status}>Ничего не найдено</p>
          )}
          {results.length > 0 && (
            <>
              <div
                aria-label="Результаты поиска"
                className={styles.resultList}
                id={listboxId}
                role="listbox"
              >
                {groups.map((group) => (
                  <div
                    aria-label={group.name}
                    className={styles.group}
                    key={group.name}
                    role="group"
                  >
                    <p className={styles.groupTitle}>{group.name}</p>
                    {group.results.map((result) =>
                      renderResult(result, results.indexOf(result)),
                    )}
                  </div>
                ))}
              </div>
              <button
                className={styles.allResults}
                onClick={navigateToSearch}
                type="button"
              >
                Все результаты <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
