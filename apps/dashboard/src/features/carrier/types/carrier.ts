export type CarrierKind = "twy" | "outside";

export enum CarrierStatus {
  APPROVED = "approved",
  DENIED = "denied",
}

export enum InsuranceStatus {
  VALID = "valid",
  EXPIRED = "expired",
  PENDING = "pending",
}

export interface Carrier {
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
  paymentMethod: string | null;
  paymentTerms: string | null;
  status: CarrierStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarrierFormData {
  kind: CarrierKind;
  carrierName: string;
  mcDotNumber: string;
  equipmentType?: string;
  insuranceExpiry?: string;
  phone?: string;
  email?: string;
  notes?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  status: CarrierStatus;
}

export interface UpdateCarrierRequest {
  id: string;
  carrierName?: string;
  mcDotNumber?: string;
  equipmentType?: string;
  insuranceExpiry?: string;
  phone?: string;
  email?: string;
  notes?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  status?: CarrierStatus;
}

export interface GetCarriersParams {
  kind: CarrierKind;
  page?: number;
  limit?: number;
  sortField?:
    | "carrierName"
    | "mcDotNumber"
    | "status"
    | "insuranceStatus"
    | "createdAt"
    | undefined;
  sortOrder?: "ascend" | "descend" | undefined;
  query?: string;
  filters?: string;
}

export interface CarrierListResponse {
  carriers: Carrier[];
  total: number;
}
