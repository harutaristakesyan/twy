import { describe, expect, it } from "vitest";
import type { ExternalBillingLoad } from "../types/billing";
import { groupLoadsByCreator, UNKNOWN_CREATOR_LABEL } from "./groupLoadsByCreator";

const makeLoad = (overrides: Partial<ExternalBillingLoad> = {}): ExternalBillingLoad => ({
  loadId: overrides.loadId ?? "load-1",
  referenceNumber: overrides.referenceNumber ?? "REF-1",
  carrierName: null,
  brokerReceivable: 100,
  brokerReceivedAmount: 50,
  brokerReceivedDate: null,
  carrierPayable: 80,
  carrierPaidAmount: 30,
  carrierPaidDate: null,
  paymentStatus: "Pending",
  createdByUserId: "user-1",
  createdByUserName: "Alice Anderson",
  ...overrides,
});

describe("groupLoadsByCreator", () => {
  it("groups loads by creator and sums money fields", () => {
    const loads: ExternalBillingLoad[] = [
      makeLoad({ loadId: "l1", createdByUserId: "u1", createdByUserName: "Alice" }),
      makeLoad({
        loadId: "l2",
        createdByUserId: "u1",
        createdByUserName: "Alice",
        brokerReceivable: 200,
        brokerReceivedAmount: 100,
        carrierPayable: 150,
        carrierPaidAmount: 50,
      }),
      makeLoad({
        loadId: "l3",
        createdByUserId: "u2",
        createdByUserName: "Bob",
        brokerReceivable: 10,
        brokerReceivedAmount: 5,
        carrierPayable: 8,
        carrierPaidAmount: 2,
      }),
    ];

    const groups = groupLoadsByCreator(loads);

    expect(groups).toHaveLength(2);
    const alice = groups.find((g) => g.userId === "u1");
    const bob = groups.find((g) => g.userId === "u2");

    expect(alice?.loadCount).toBe(2);
    expect(alice?.totalBrokerReceivable).toBe(300);
    expect(alice?.totalBrokerReceived).toBe(150);
    expect(alice?.totalCarrierPayable).toBe(230);
    expect(alice?.totalCarrierPaid).toBe(80);
    expect(alice?.owedToBranch).toBe(150);

    expect(bob?.loadCount).toBe(1);
    expect(bob?.totalBrokerReceivable).toBe(10);
    expect(bob?.owedToBranch).toBe(6);
  });

  it("buckets null createdBy into an 'Unknown creator' group sorted last", () => {
    const loads: ExternalBillingLoad[] = [
      makeLoad({ loadId: "l1", createdByUserId: null, createdByUserName: null }),
      makeLoad({ loadId: "l2", createdByUserId: "u1", createdByUserName: "Alice" }),
    ];

    const groups = groupLoadsByCreator(loads);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.userId).toBe("u1");
    expect(groups[1]?.userId).toBeNull();
    expect(groups[1]?.userName).toBe(UNKNOWN_CREATOR_LABEL);
  });

  it("handles a single-load-per-user collapse case", () => {
    const loads = [makeLoad({ loadId: "l1", createdByUserId: "u1" })];
    const groups = groupLoadsByCreator(loads);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.loadCount).toBe(1);
    expect(groups[0]?.loads).toHaveLength(1);
  });

  it("preserves sum equality: Σ(user totals) === Σ(load totals)", () => {
    const loads: ExternalBillingLoad[] = [
      makeLoad({
        loadId: "l1",
        createdByUserId: "u1",
        brokerReceivable: 100,
        brokerReceivedAmount: null,
        carrierPayable: 50,
        carrierPaidAmount: null,
      }),
      makeLoad({
        loadId: "l2",
        createdByUserId: "u2",
        brokerReceivable: null,
        brokerReceivedAmount: 25,
        carrierPayable: 40,
        carrierPaidAmount: 10,
      }),
      makeLoad({
        loadId: "l3",
        createdByUserId: null,
        createdByUserName: null,
        brokerReceivable: 7,
        brokerReceivedAmount: 3,
        carrierPayable: 5,
        carrierPaidAmount: 1,
      }),
    ];

    const groups = groupLoadsByCreator(loads);
    const sum = (
      key:
        | "totalBrokerReceivable"
        | "totalBrokerReceived"
        | "totalCarrierPayable"
        | "totalCarrierPaid",
    ) => groups.reduce((acc, g) => acc + g[key], 0);

    const loadSum = (k: keyof ExternalBillingLoad) =>
      loads.reduce((acc, l) => acc + (Number(l[k]) || 0), 0);

    expect(sum("totalBrokerReceivable")).toBe(loadSum("brokerReceivable"));
    expect(sum("totalBrokerReceived")).toBe(loadSum("brokerReceivedAmount"));
    expect(sum("totalCarrierPayable")).toBe(loadSum("carrierPayable"));
    expect(sum("totalCarrierPaid")).toBe(loadSum("carrierPaidAmount"));
  });
});
