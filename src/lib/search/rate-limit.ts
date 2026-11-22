import "server-only";

const SEARCH_WINDOW_MS = 60_000;
const SEARCH_REQUEST_LIMIT = 20;

const globalForSearchRateLimit = globalThis as typeof globalThis & {
  campusSearchRequests?: Map<string, number[]>;
};

const searchRequests =
  globalForSearchRateLimit.campusSearchRequests ??=
    new Map<string, number[]>();

export function consumeSearchRateLimit(
  sessionKey: string,
  now = Date.now(),
): boolean {
  const recentRequests = (searchRequests.get(sessionKey) ?? []).filter(
    (timestamp) => now - timestamp < SEARCH_WINDOW_MS,
  );

  if (recentRequests.length >= SEARCH_REQUEST_LIMIT) {
    searchRequests.set(sessionKey, recentRequests);
    return false;
  }

  recentRequests.push(now);
  searchRequests.set(sessionKey, recentRequests);
  if (searchRequests.size > 1000) {
    for (const [key, timestamps] of searchRequests) {
      const activeTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < SEARCH_WINDOW_MS,
      );
      if (activeTimestamps.length === 0) {
        searchRequests.delete(key);
      } else {
        searchRequests.set(key, activeTimestamps);
      }
    }
  }
  return true;
}
