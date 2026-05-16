export enum BrokerStatus {
  APPROVED = "approved",
  PENDING = "pending",
  DENIED = "denied",
}

export interface OutsideBroker {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  status: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OutsideBrokerFormData {
  brokerName: string;
  mcNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  /** Present when editing an approved broker */
  status?: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit?: number | null;
}

export interface UpdateOutsideBrokerRequest {
  id: string;
  brokerName?: string;
  mcNumber?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  status?: BrokerStatus;
  creditLimitUnlimited?: boolean;
  creditLimit?: number | null;
}

export interface GetOutsideBrokersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of brokers per page (default: 10)
  sortField?: "brokerName" | "mcNumber" | "createdAt" | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for broker name, MC number
  filters?: string;
}

export interface PaginatedOutsideBrokersResponse {
  brokers: OutsideBroker[];
  total: number;
}
