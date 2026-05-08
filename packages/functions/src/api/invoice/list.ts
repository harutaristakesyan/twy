import { middyfy } from "@shared/index";
import type { InvoiceListResponse } from "@twy/core";
import {
  assertPermission,
  buildScope,
  getLoadBranchId,
  type ListInvoicesEvent,
  ListInvoicesEventSchema,
  listInvoicesForLoad,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const listInvoicesHandler = async (event: ListInvoicesEvent): Promise<InvoiceListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "invoices", "view");

  const scope = buildScope(ctx);
  if (scope.denyAll) throw new createError.Forbidden("Forbidden");

  const { loadId } = event.queryStringParameters;

  if (!loadId) {
    throw new createError.BadRequest("loadId is required");
  }

  const branchId = await getLoadBranchId(loadId);
  if (!branchId) throw new createError.NotFound("Load not found");
  if (scope.branchId && branchId !== scope.branchId) throw new createError.NotFound("Not found");

  const invoices = await listInvoicesForLoad(loadId);

  return { invoices };
};

export const handler = middyfy<
  ListInvoicesEvent,
  InvoiceListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listInvoicesHandler, { eventSchema: ListInvoicesEventSchema, mode: "parse" });
