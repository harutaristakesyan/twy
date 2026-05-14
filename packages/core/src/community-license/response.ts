export interface CommunityLicenseResponse {
  id: string;
  ciNumber: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityLicenseListResponse {
  communityLicenses: CommunityLicenseResponse[];
  total: number;
}
