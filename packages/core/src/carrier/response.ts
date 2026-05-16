import type { CarrierKind, CarrierStatus, InsuranceStatus } from "@twy/db";

export interface CarrierResponse {
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
  createdAt: string;
  updatedAt: string;
}

export interface CarrierListResponse {
  carriers: CarrierResponse[];
  total: number;
}
