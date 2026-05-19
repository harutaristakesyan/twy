import type { BrokerRequestStatus } from "@twy/db";

export interface BrokerRequestResponse {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  status: BrokerRequestStatus;
  submittedBy: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  submittedByPhone: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  resultBrokerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrokerRequestListResponse {
  requests: BrokerRequestResponse[];
  total: number;
}
