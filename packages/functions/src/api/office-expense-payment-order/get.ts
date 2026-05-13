import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type GetOfficeExpenseEvent,
  GetOfficeExpenseEventSchema,
  getOfficeExpensePaymentOrder,
  loadAuthContext,
  type OfficeExpensePaymentOrderResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const getHandler = async (
  event: GetOfficeExpenseEvent,
): Promise<OfficeExpensePaymentOrderResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "view");
  const scope = buildScope(ctx);

  const { id } = event.pathParameters;
  const order = await getOfficeExpensePaymentOrder(id);
  if (!order) throw new errors.NotFound(`Office expense payment order ${id} not found`);
  if (scope.ownerId && order.createdBy !== scope.ownerId)
    throw new errors.NotFound(`Office expense payment order ${id} not found`);

  return order;
};

export const handler = middyfy<
  GetOfficeExpenseEvent,
  OfficeExpensePaymentOrderResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getHandler, {
  eventSchema: GetOfficeExpenseEventSchema,
  mode: "parse",
});
