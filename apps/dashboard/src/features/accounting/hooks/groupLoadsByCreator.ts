import type { ExternalBillingLoad } from "../types/billing";

export const UNKNOWN_CREATOR_KEY = "unknown";
export const UNKNOWN_CREATOR_LABEL = "Unknown creator";

export interface ExternalBillingUserGroup {
  userId: string | null;
  userName: string;
  loadCount: number;
  totalBrokerReceivable: number;
  totalBrokerReceived: number;
  totalCarrierPayable: number;
  totalCarrierPaid: number;
  owedToBranch: number;
  loads: ExternalBillingLoad[];
}

// Sum in cents to avoid drift across many floating-point additions, then divide once.
const toCents = (v: number | null | undefined): number => (v == null ? 0 : Math.round(v * 100));

const fromCents = (cents: number): number => cents / 100;

export function groupLoadsByCreator(loads: ExternalBillingLoad[]): ExternalBillingUserGroup[] {
  type Bucket = {
    userId: string | null;
    userName: string;
    loadCount: number;
    brokerReceivableCents: number;
    brokerReceivedCents: number;
    carrierPayableCents: number;
    carrierPaidCents: number;
    loads: ExternalBillingLoad[];
  };

  const buckets = new Map<string, Bucket>();

  for (const load of loads) {
    const key = load.createdByUserId ?? UNKNOWN_CREATOR_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        userId: load.createdByUserId,
        userName: load.createdByUserName ?? UNKNOWN_CREATOR_LABEL,
        loadCount: 0,
        brokerReceivableCents: 0,
        brokerReceivedCents: 0,
        carrierPayableCents: 0,
        carrierPaidCents: 0,
        loads: [],
      };
      buckets.set(key, bucket);
    }
    bucket.loads.push(load);
    bucket.loadCount += 1;
    bucket.brokerReceivableCents += toCents(load.brokerReceivable);
    bucket.brokerReceivedCents += toCents(load.brokerReceivedAmount);
    bucket.carrierPayableCents += toCents(load.carrierPayable);
    bucket.carrierPaidCents += toCents(load.carrierPaidAmount);
  }

  const groups: ExternalBillingUserGroup[] = Array.from(buckets.values()).map((b) => ({
    userId: b.userId,
    userName: b.userName,
    loadCount: b.loadCount,
    totalBrokerReceivable: fromCents(b.brokerReceivableCents),
    totalBrokerReceived: fromCents(b.brokerReceivedCents),
    totalCarrierPayable: fromCents(b.carrierPayableCents),
    totalCarrierPaid: fromCents(b.carrierPaidCents),
    owedToBranch: fromCents(b.carrierPayableCents - b.carrierPaidCents),
    loads: b.loads,
  }));

  groups.sort((a, b) => {
    if (a.userId === null) return 1;
    if (b.userId === null) return -1;
    return a.userName.localeCompare(b.userName);
  });

  return groups;
}
