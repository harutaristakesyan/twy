import { middyfy } from "@shared/index";
import type { CreateInvoiceResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type CreateInvoiceEvent,
  CreateInvoiceEventSchema,
  createInvoice,
  getLoadBranchId,
  loadAuthContext,
  tryAutoApprove,
} from "@twy/core";
import { db } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const createInvoiceHandler = async (event: CreateInvoiceEvent): Promise<CreateInvoiceResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "invoices", "add");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { loadId, type, amount, paymentTermDays, fileId } = event.body;

  const branchId = await getLoadBranchId(loadId);
  if (!branchId) throw new createError.NotFound("Load not found");
  if (scope.branchId && branchId !== scope.branchId) throw new createError.NotFound("Not found");

  const inv = await db.transaction(async (tx) => {
    const created = await createInvoice(tx, {
      loadId,
      type,
      amount,
      paymentTermDays,
      fileId,
      createdBy: userId,
    });
    await tryAutoApprove(tx, loadId);
    return created;
  });

  return { message: "Invoice created", invoice: inv };
};

export const handler = middyfy<
  CreateInvoiceEvent,
  CreateInvoiceResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createInvoiceHandler, { eventSchema: CreateInvoiceEventSchema, mode: "parse" });
