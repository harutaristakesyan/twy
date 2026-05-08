import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type DeleteInvoiceEvent,
  DeleteInvoiceEventSchema,
  getInvoice,
  getLoadBranchId,
  loadAuthContext,
  voidInvoice,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteInvoiceHandler = async (event: DeleteInvoiceEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "invoices", "edit");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { invoiceId } = event.pathParameters;

  const inv = await getInvoice(invoiceId);
  if (!inv) throw new createError.NotFound("Invoice not found");

  if (scope.branchId) {
    const branchId = await getLoadBranchId(inv.loadId);
    if (branchId !== scope.branchId) throw new createError.NotFound("Not found");
  }

  if (inv.status === "paid") {
    throw new createError.BadRequest("Cannot void a paid invoice");
  }

  await voidInvoice(invoiceId);

  return { message: "Invoice voided" };
};

export const handler = middyfy<
  DeleteInvoiceEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteInvoiceHandler, { eventSchema: DeleteInvoiceEventSchema, mode: "parse" });
