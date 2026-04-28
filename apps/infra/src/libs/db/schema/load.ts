import type { NumN, StrN, Timestamp } from "./types.js";

export interface LoadTable {
  // Audit fields
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Customer Information
  customerId: string;
  referenceNumber: string;
  customerRate: NumN;
  contactName: StrN;

  // Carrier Information
  carrier: StrN;
  carrierPaymentMethod: StrN;
  carrierRate: NumN;
  chargeServiceFeeToOffice: boolean;

  // Load Details
  loadType: string;
  serviceType: string;
  serviceGivenAs: StrN;
  commodity: string;

  // Booking/Selling Information
  bookedAs: StrN;
  soldAs: StrN;
  weight: NumN;
  temperature: NumN;

  // Pick-up Information
  pickupCityZipcode: string;
  pickupPhoneNumber: string;
  pickupCarrier: string;
  pickupName: string;
  pickupAddress: string;

  // Drop-off Information
  dropoffCityZipcode: string;
  dropoffPhoneNumber: string;
  dropoffCarrier: string;
  dropoffName: string;
  dropoffAddress: string;

  // Files & Branch
  branchId: string;
  fileUrls: string | null; // JSON array stored as text for S3 URLs
}
