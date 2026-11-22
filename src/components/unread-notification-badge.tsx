export function UnreadNotificationBadge({
  className,
  count,
}: {
  className?: string;
  count: number;
}) {
  if (count <= 0) return null;

  return (
    <span
      aria-label={`Непрочитанных уведомлений: ${count}`}
      className={className}
      role="img"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
