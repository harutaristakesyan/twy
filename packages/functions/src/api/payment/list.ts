import { middyfy } from "@shared/index";
import type { PaymentListResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getInvoice,
  getLoadBranchId,
  type ListPaymentsEvent,
  ListPaymentsEventSchema,
  listPaymentsForInvoice,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const listPaymentsHandler = async (event: ListPaymentsEvent): Promise<PaymentListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payments", "view");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { invoiceId } = event.pathParameters;

  if (scope.branchId) {
    const inv = await getInvoice(invoiceId);
    if (!inv) throw new createError.NotFound("Invoice not found");
    const branchId = await getLoadBranchId(inv.loadId);
    if (branchId !== scope.branchId) throw new createError.NotFound("Not found");
  }

  const payments = await listPaymentsForInvoice(invoiceId);

  return { payments };
};

export const handler = middyfy<
  ListPaymentsEvent,
  PaymentListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listPaymentsHandler, { eventSchema: ListPaymentsEventSchema, mode: "parse" });
