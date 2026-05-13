import { describe, expect, it } from "vitest";
import { PERMISSION_REGISTRY } from "./team.js";

describe("PERMISSION_REGISTRY", () => {
  it("covers all 13 entities", () => {
    expect(Object.keys(PERMISSION_REGISTRY)).toHaveLength(13);
  });

  it("loads has transitions", () => {
    expect(PERMISSION_REGISTRY.loads.transitions).toContain("Approved");
    expect(PERMISSION_REGISTRY.loads.transitions).toHaveLength(5);
  });

  it("load_payment_order has all 7 payment status transitions", () => {
    expect(PERMISSION_REGISTRY.load_payment_order.transitions).toHaveLength(7);
    expect(PERMISSION_REGISTRY.load_payment_order.transitions).toContain("ReadyForInvoice");
  });

  it("office_expense_payment_order has 6 transitions (no ReadyForInvoice)", () => {
    expect(PERMISSION_REGISTRY.office_expense_payment_order.transitions).toHaveLength(6);
    expect(PERMISSION_REGISTRY.office_expense_payment_order.transitions).not.toContain(
      "ReadyForInvoice",
    );
  });
});
