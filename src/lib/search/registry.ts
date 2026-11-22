import "server-only";

import { campusSearchProviders } from "@/lib/search/providers/campus";
import { staffSearchProviders } from "@/lib/search/providers/staff";
import type {
  SearchGroup,
  SearchProvider,
  SearchUser,
} from "@/lib/search/types";
import type { SearchQuery } from "@/lib/search/query";

export const searchProviders: readonly SearchProvider[] = [
  ...campusSearchProviders,
  ...staffSearchProviders,
];

export async function searchSite(
  query: SearchQuery,
  user: SearchUser,
  limit: number,
): Promise<SearchGroup[]> {
  const pages = await Promise.all(
    searchProviders
      .filter((provider) => provider.role === user.role)
      .map(async (provider) => ({
        provider,
        page: await provider.search(query, user, limit),
      })),
  );
  const groups = new Map<string, SearchGroup>();

  for (const { provider, page } of pages) {
    if (page.results.length === 0 && !page.hasMore) continue;

    const existing = groups.get(provider.group);
    if (existing) {
      existing.results.push(...page.results);
      existing.hasMore ||= page.hasMore;
    } else {
      groups.set(provider.group, {
        name: provider.group,
        results: page.results,
        hasMore: page.hasMore,
      });
    }
  }

  return Array.from(groups.values());
}
