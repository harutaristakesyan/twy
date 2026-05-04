import type { LoadStatus } from "@twy/db";
import type { MessageResponse } from "../shared/response.js";

export interface LoadLocationResponse {
  cityZipCode: string | null;
  phone: string | null;
  carrier: string;
  name: string;
  address: string;
}

export interface LoadResponse {
  id: string;
  customer: string;
  referenceNumber: string;
  customerRate: number | null;
  contactName: string;
  paymentMethod: string;
  paymentTerms: string;
  carrier: string | null;
  carrierPaymentMethod: string | null;
  carrierRate: number;
  chargeServiceFeeToOffice: boolean;
  isChargable: boolean;
  chargeAmount: number | null;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature: string | null;
  pickup: LoadLocationResponse;
  dropoff: LoadLocationResponse;
  branchId: string;
  status: LoadStatus;
  statusChangedBy: string | null;
  files: LoadFileResponse[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateLoadResponse extends MessageResponse {
  loadId: string;
}

export interface ChangeLoadStatusResponse extends MessageResponse {
  loadId: string;
  status: LoadStatus;
}

export interface LoadDetailsResponse {
  load: LoadResponse;
}

export interface LoadFileResponse {
  id: string;
  fileName: string;
}

export interface LoadListResponse {
  loads: LoadResponse[];
  total: number;
}
