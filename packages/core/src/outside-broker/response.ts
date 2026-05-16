import type { BrokerStatus } from "@twy/db";

export interface OutsideBrokerResponse {
  id: string;
  brokerName: string;
  mcNumber: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  status: BrokerStatus;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutsideBrokerListResponse {
  brokers: OutsideBrokerResponse[];
  total: number;
}
