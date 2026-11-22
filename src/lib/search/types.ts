import type { SearchQuery } from "@/lib/search/query";

export type StudentSearchUser = {
  role: "STUDENT";
  userId: number;
  login: string;
  student: {
    id: number;
    fullName: string;
    faculty: string;
    direction: string;
    course: number;
    group: { id: number; name: string };
  };
};

export type StaffSearchUser = {
  role: "STAFF";
  userId: number;
  staff: {
    id: number;
    fullName: string;
    position: string;
    department: string;
    isSupervisor: boolean;
  };
};

export type SearchUser = StudentSearchUser | StaffSearchUser;

export type SearchResult = {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
};

export type SearchProviderPage = {
  results: SearchResult[];
  hasMore: boolean;
};

export type SearchProvider = {
  id: string;
  role: SearchUser["role"];
  group: string;
  search: (
    query: SearchQuery,
    user: SearchUser,
    limit: number,
  ) => Promise<SearchProviderPage>;
};

export type SearchGroup = {
  name: string;
  results: SearchResult[];
  hasMore: boolean;
};
