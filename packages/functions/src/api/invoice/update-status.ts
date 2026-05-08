import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getInvoice,
  getLoadBranchId,
  loadAuthContext,
  type UpdateInvoiceStatusEvent,
  UpdateInvoiceStatusEventSchema,
  updateInvoiceStatus,
} from "@twy/core";
import { db } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const updateInvoiceStatusHandler = async (
  event: UpdateInvoiceStatusEvent,
): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "invoices", "edit");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { invoiceId } = event.pathParameters;
  const { status } = event.body;

  const inv = await getInvoice(invoiceId);
  if (!inv) throw new createError.NotFound("Invoice not found");

  if (scope.branchId) {
    const branchId = await getLoadBranchId(inv.loadId);
    if (branchId !== scope.branchId) throw new createError.NotFound("Not found");
  }

  await updateInvoiceStatus(db, invoiceId, status);

  return { message: "Invoice status updated" };
};

export const handler = middyfy<
  UpdateInvoiceStatusEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateInvoiceStatusHandler, { eventSchema: UpdateInvoiceStatusEventSchema, mode: "parse" });
