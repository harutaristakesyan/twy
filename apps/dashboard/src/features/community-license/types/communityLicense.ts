export interface CommunityLicense {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCIFormData {
  ciNumber: string;
  validFrom: string;
  validTo?: string | null;
}

export interface UpdateCIRequest {
  id: string;
  ciNumber?: string;
  validFrom?: string;
  validTo?: string | null;
}

export interface GetCommunityLicensesParams {
  page?: number;
  limit?: number;
  sortField?: "ciNumber" | "validFrom" | "createdAt";
  sortOrder?: "ascend" | "descend";
  query?: string;
}

export interface PaginatedCIResponse {
  communityLicenses: CommunityLicense[];
  total: number;
}
