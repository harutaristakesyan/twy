import type { CarrierKind, CarrierRequestStatus, InsuranceStatus } from "@twy/db";

export interface CarrierRequestResponse {
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
  submittedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultCarrierId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierRequestListResponse {
  requests: CarrierRequestResponse[];
  total: number;
}
