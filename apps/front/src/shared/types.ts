import type { SortOrder } from 'antd/es/table/interface'

export interface SearchParams {
  query?: string
  page?: number
  limit?: number
  sortOrder?: SortOrder
  sortField?: string
}
