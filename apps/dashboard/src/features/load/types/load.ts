export type LoadStatus = "Pending" | "Approved" | "Delivered" | "Declined" | "Hold";

export interface LoadFile {
  id: string;
  fileName: string;
  documentCategory: string | null;
}

export interface Location {
  originName?: string | null;
  pickupNumber?: number | null;
  cityZipCode?: string | null;
  phone?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
}

export interface LoadBrokerSummary {
  id: string;
  brokerName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
}

export interface LoadCarrierSummary {
  id: string;
  carrierName: string;
  mcDotNumber: string;
  paymentMethod: string | null;
  paymentTerms: string | null;
}

export interface Load {
  id: string;
  referenceNumber: string;
  brokerRate?: number | null;
  broker: LoadBrokerSummary;
  carrier: LoadCarrierSummary | null;
  carrierRate?: number | null;
  chargeServiceFeeToOffice: boolean;
  isChargable: boolean;
  chargeAmount?: number | null;
  chargeSide?: "broker" | "carrier" | null;
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature?: string | null;
  transportBodyTypes: string[];
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
  brokerId: string;
  brokerRate?: number | null;
  carrierId?: string | null;
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
  transportBodyTypes?: string[];
  pickups: Location[];
  dropoffs: Location[];
  files?: LoadFile[];
}

export type UpdateLoadDto = Partial<CreateLoadDto>;

export interface ChangeLoadStatusDto {
  status: LoadStatus;
  isChargable: boolean;
  chargeAmount?: number | null;
  chargeSide?: "broker" | "carrier" | null;
  fileIds?: string[];
  comment?: string;
}

export type LoadCommentType = "charge_reason" | "hold_reason" | "decline_reason" | "general";

export interface LoadComment {
  id: string;
  loadId: string;
  userId: string | null;
  authorName: string | null;
  authorProfilePictureFileId: string | null;
  commentType: LoadCommentType;
  body: string;
  createdAt: string;
}

export interface LoadCommentsResponse {
  comments: LoadComment[];
}

export interface AddCommentDto {
  body: string;
}

export interface GetLoadsParams {
  page?: number;
  limit?: number;
  sortField?: "referenceNumber" | "status" | "createdAt" | "broker";
  sortOrder?: "ascend" | "descend";
  query?: string;
  filters?: string;
  excludeWithExistingPO?: boolean;
}

export interface PaginatedLoadsResponse {
  loads: Load[];
  total: number;
}
