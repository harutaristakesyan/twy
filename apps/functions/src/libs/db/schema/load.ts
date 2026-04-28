import { StrN, NumN, Timestamp } from "./types.js";

export const loadStatusValues = ["Pending", "Approved", "Denied"] as const;

export type LoadStatus = (typeof loadStatusValues)[number];

export interface LoadTable {
  // Audit fields
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Customer Information
  customer: string;
  referenceNumber: string;
  customerRate: NumN;
  contactName: string;

  // Carrier Information
  carrier: StrN;
  carrierPaymentMethod: StrN;
  carrierRate: number;
  chargeServiceFeeToOffice: boolean;

  // Load Details
  loadType: string;
  serviceType: string;
  serviceGivenAs: string;
  commodity: string;

  // Booking/Selling Information
  bookedAs: string;
  soldAs: string;
  weight: string;
  temperature: StrN;

  // Pick-up Information
  pickupCityZipCode: StrN;
  pickupPhone: StrN;
  pickupCarrier: string;
  pickupName: string;
  pickupAddress: string;

  // Drop-off Information
  dropoffCityZipCode: StrN;
  dropoffPhone: StrN;
  dropoffCarrier: string;
  dropoffName: string;
  dropoffAddress: string;

  // Files & Branch
  branchId: string;
  status: LoadStatus;
  statusChangedBy: string | null;
}

export interface LoadFilesTable {
  loadId: string;
  fileId: string;
}
