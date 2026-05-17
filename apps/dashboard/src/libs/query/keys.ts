/**
 * Single source of truth for all React Query keys used in the dashboard.
 *
 * Conventions:
 * - `all` is the list-root key — invalidate it to refetch every paginated/filtered variant.
 * - `list(...)` returns a key for a specific filtered list. Partial-matching invalidation
 *   on `all` still hits these because TanStack Query matches by prefix.
 * - `detail(id)` returns a key for a single entity. Detail keys use the singular noun
 *   (`["user", id]`) which means they are NOT invalidated by `all` — invalidate detail
 *   keys explicitly when needed.
 */
export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (query?: string) => ["users", query] as const,
    detail: (id: string | undefined) => ["user", id] as const,
  },
  branches: {
    all: ["branches"] as const,
    list: (query?: string) => ["branches", query] as const,
    detail: (id: string | undefined) => ["branch", id] as const,
    filterOptions: () => ["branches-filter"] as const,
  },
  carriers: {
    all: ["carriers"] as const,
    list: (kind?: string, query?: string) => ["carriers", kind, query] as const,
    detail: (id: string | undefined) => ["carrier", id] as const,
    outsideFilterOptions: () => ["carriers-outside-filter"] as const,
  },
  carrierRequests: {
    all: ["carrier-requests"] as const,
    list: (query?: string) => ["carrier-requests", query] as const,
    detail: (id: string | undefined) => ["carrier-request", id] as const,
  },
  outsideBrokers: {
    all: ["outside-brokers"] as const,
    list: (query?: string) => ["outside-brokers", query] as const,
    detail: (id: string | undefined) => ["outside-broker", id] as const,
    filterOptions: () => ["brokers-filter"] as const,
  },
  brokerRequests: {
    all: ["broker-requests"] as const,
    list: (query?: string) => ["broker-requests", query] as const,
    detail: (id: string | undefined) => ["broker-request", id] as const,
  },
  loads: {
    all: ["loads"] as const,
    list: (filters?: unknown) => ["loads", filters] as const,
    detail: (id: string | null | undefined) => ["load", id] as const,
    comments: (loadId: string | null | undefined) => ["load", loadId, "comments"] as const,
    forPoSearch: (query: string) => ["loads-for-po-search", query] as const,
  },
  teams: {
    all: ["teams"] as const,
    list: (query?: string, filter?: unknown) => ["teams", query, filter] as const,
    detail: (id: string | undefined) => ["team", id] as const,
    members: (teamId: string) => ["team-members", teamId] as const,
  },
  communityLicenses: {
    all: ["community-licenses"] as const,
    detail: (id: string | undefined) => ["community-license", id] as const,
  },
  paymentOrders: {
    all: ["payment-orders"] as const,
    list: (query?: string) => ["payment-orders", query] as const,
    detail: (id: string | undefined) => ["payment-order", id] as const,
  },
  officeExpenseOrders: {
    all: ["office-expense-orders"] as const,
    list: (query?: string) => ["office-expense-orders", query] as const,
    detail: (id: string | undefined) => ["office-expense-order", id] as const,
  },
  billing: {
    internal: (apiParams?: unknown) => ["billing-internal", apiParams] as const,
    external: (apiParams?: unknown) => ["billing-external", apiParams] as const,
  },
} as const;
