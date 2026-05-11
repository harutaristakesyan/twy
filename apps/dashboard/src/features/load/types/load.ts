export type LoadStatus = "Pending" | "Approved" | "Delivered" | "Declined" | "Hold";

export interface LoadFile {
  id: string;
  fileName: string;
  documentCategory: string | null;
}

export interface Location {
  cityZipCode?: string | null;
  phone?: string | null;
  carrier: string;
  name: string;
  address: string;
}

export interface Load {
  id: string;
  customer: string;
  referenceNumber: string;
  customerRate?: number | null;
  contactName: string;
  paymentMethod: string;
  paymentTerms: string;
  carrier?: string | null;
  carrierPaymentMethod?: string | null;
  carrierRate?: number | null;
  chargeServiceFeeToOffice: boolean;
  isChargable: boolean;
  chargeAmount?: number | null;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature?: string | null;
  pickups: Location[];
  dropoffs: Location[];
  branchId: string;
  branchName: string;
  serviceFee: number | null;
  status: LoadStatus;
  statusChangedBy: string | null;
  files: LoadFile[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoadDto {
  customer: string;
  referenceNumber: string;
  customerRate?: number | null;
  contactName: string;
  paymentMethod: string;
  paymentTerms: string;
  carrier?: string | null;
  carrierPaymentMethod?: string | null;
  carrierRate?: number | null;
  chargeServiceFeeToOffice: boolean;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature?: string | null;
  pickups: Location[];
  dropoffs: Location[];
  files?: LoadFile[];
}

export type UpdateLoadDto = Partial<CreateLoadDto>;

export interface ChangeLoadStatusDto {
  status: LoadStatus;
  isChargable: boolean;
  chargeAmount?: number | null;
}

export interface GetLoadsParams {
  page?: number;
  limit?: number;
  sortField?: "referenceNumber" | "status" | "createdAt" | "customer";
  sortOrder?: "ascend" | "descend";
  query?: string;
  filters?: string;
}

export interface PaginatedLoadsResponse {
  loads: Load[];
  total: number;
}
