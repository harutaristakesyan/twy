export enum CarrierStatus {
  APPROVED = "approved",
  DENIED = "denied",
}

export enum InsuranceStatus {
  VALID = "valid",
  EXPIRED = "expired",
  PENDING = "pending",
}

export interface OutsideCarrier {
  id: string;
  carrierName: string;
  mcDotNumber: string;
  equipmentType: string | null;
  insuranceStatus: InsuranceStatus;
  insuranceExpiry: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: CarrierStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface OutsideCarrierFormData {
  carrierName: string;
  mcDotNumber: string;
  equipmentType?: string;
  insuranceExpiry?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: CarrierStatus;
}

export interface UpdateOutsideCarrierRequest {
  id: string;
  carrierName?: string;
  mcDotNumber?: string;
  equipmentType?: string;
  insuranceExpiry?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status?: CarrierStatus;
}

export interface GetOutsideCarriersParams {
  page?: number; // zero-indexed page number (default: 0)
  limit?: number; // number of carriers per page (default: 10)
  sortField?:
    | "carrierName"
    | "mcDotNumber"
    | "status"
    | "insuranceStatus"
    | "createdAt"
    | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string; // search text for carrier name, MC/DOT number
}

export interface PaginatedOutsideCarriersResponse {
  carriers: OutsideCarrier[];
  total: number;
}
