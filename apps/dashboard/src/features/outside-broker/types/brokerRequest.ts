export type BrokerRequestStatusFilter = "pending" | "approved" | "rejected" | "all";

export interface BrokerRequest {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  branchId: string | null;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  status: "pending" | "approved" | "rejected";
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultBrokerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrokerRequestListResponse {
  requests: BrokerRequest[];
  total: number;
}

export interface ListBrokerRequestsParams {
  page?: number;
  limit?: number;
  sortField?: "createdAt" | "brokerName" | "mcNumber" | "status";
  sortOrder?: "ascend" | "descend";
  status?: BrokerRequestStatusFilter;
  query?: string;
}

export interface SubmitBrokerRequestBody {
  brokerName: string;
  mcNumber: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  branchId?: string;
  creditLimitUnlimited: boolean;
  creditLimit?: number | null;
}
