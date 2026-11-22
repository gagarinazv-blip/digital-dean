import styles from "./search-highlight.module.css";

function getHighlightPattern(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  const variants = terms.map((term) =>
    term
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/е/g, "[её]"),
  );
  return new RegExp(`(${variants.join("|")})`, "giu");
}

export function SearchHighlight({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const pattern = getHighlightPattern(terms);
  if (!pattern) return text;
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark className={styles.highlight} key={`${index}-${part}`}>
        {part}
      </mark>
    ) : (
      <span key={`${index}-${part}`}>{part}</span>
    ),
  );
}
