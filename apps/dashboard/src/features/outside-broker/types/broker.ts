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
  status: BrokerStatus;
  branch: {
    id: string;
    name: string;
  } | null;
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
  status: BrokerStatus;
  branch?: string; // Branch ID (optional)
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
  status?: BrokerStatus;
  branch?: string; // Branch ID (optional)
  creditLimitUnlimited?: boolean;
  creditLimit?: number | null;
}

export interface GetOutsideBrokersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of brokers per page (default: 10)
  sortField?: "brokerName" | "mcNumber" | "status" | "createdAt" | "branch" | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for broker name, MC number
}

export interface PaginatedOutsideBrokersResponse {
  brokers: OutsideBroker[];
  total: number;
}
