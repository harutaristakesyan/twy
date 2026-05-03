import type { CarrierKind, InsuranceStatus } from "./carrier";

export type CarrierRequestStatus = "pending" | "approved" | "rejected";

export type CarrierRequestStatusFilter = CarrierRequestStatus | "all";

export interface CarrierRequest {
  id: string;
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceExpiry: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CarrierRequestStatus;
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultCarrierId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierRequestListResponse {
  requests: CarrierRequest[];
  total: number;
}

export interface ListCarrierRequestsParams {
  page?: number;
  limit?: number;
  sortField?: "createdAt" | "carrierName" | "mcDotNumber" | "status";
  sortOrder?: "ascend" | "descend";
  status?: CarrierRequestStatusFilter;
  query?: string;
}

export interface SubmitCarrierRequestBody {
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType?: string;
  insuranceExpiry?: string;
  phone?: string;
  email?: string;
  notes?: string;
}
