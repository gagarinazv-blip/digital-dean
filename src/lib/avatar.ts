const avatarTones = ["wine", "blue", "success", "warning", "subtle"] as const;

export type AvatarTone = (typeof avatarTones)[number];

export function getAvatarInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("ru-RU");

  return initials || "?";
}

export function getAvatarTone(name: string): AvatarTone {
  let hash = 0;
  for (const character of name.trim().toLocaleLowerCase("ru-RU")) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  return avatarTones[hash % avatarTones.length];
}
