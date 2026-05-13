import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type ListOfficeExpensesEvent,
  ListOfficeExpensesEventSchema,
  listOfficeExpensePaymentOrders,
  loadAuthContext,
  type OfficeExpensePaymentOrderListResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listHandler = async (
  event: ListOfficeExpensesEvent,
): Promise<OfficeExpensePaymentOrderListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { orders: [], total: 0 };

  const { page, limit, query, filters } = event.queryStringParameters;

  return listOfficeExpensePaymentOrders({
    page,
    limit,
    query,
    advancedFilter: filters,
    ownerId: scope.ownerId,
  });
};

export const handler = middyfy<
  ListOfficeExpensesEvent,
  OfficeExpensePaymentOrderListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listHandler, {
  eventSchema: ListOfficeExpensesEventSchema,
  mode: "parse",
});
