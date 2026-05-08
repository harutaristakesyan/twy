import { middyfy } from "@shared/index";
import type { RecordPaymentResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getInvoice,
  getLoadBranchId,
  loadAuthContext,
  type RecordPaymentEvent,
  RecordPaymentEventSchema,
  recordPayment,
  tryAutoMarkPaid,
} from "@twy/core";
import { db } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const createPaymentHandler = async (event: RecordPaymentEvent): Promise<RecordPaymentResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payments", "add");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { invoiceId, amount, method, reference } = event.body;

  const inv = await getInvoice(invoiceId);
  if (!inv) throw new createError.NotFound("Invoice not found");
  if (inv.status === "void") throw new createError.BadRequest("Cannot pay a voided invoice");

  if (scope.branchId) {
    const branchId = await getLoadBranchId(inv.loadId);
    if (branchId !== scope.branchId) throw new createError.NotFound("Not found");
  }

  const pmt = await db.transaction(async (tx) => {
    const created = await recordPayment(tx, {
      invoiceId,
      amount,
      method: method ?? null,
      reference: reference ?? null,
      recordedBy: userId,
    });
    await tryAutoMarkPaid(tx, inv.loadId);
    return created;
  });

  return { message: "Payment recorded", payment: pmt };
};

export const handler = middyfy<
  RecordPaymentEvent,
  RecordPaymentResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createPaymentHandler, { eventSchema: RecordPaymentEventSchema, mode: "parse" });
