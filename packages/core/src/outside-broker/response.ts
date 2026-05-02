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
  status: BrokerStatus;
  branch: { id: string; name: string } | null;
  creditLimitUnlimited: boolean;
  creditLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutsideBrokerListResponse {
  brokers: OutsideBrokerResponse[];
  total: number;
}
