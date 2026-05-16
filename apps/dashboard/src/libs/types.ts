export type SortOrder = "ascend" | "descend";

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
  sortField?: string;
}
