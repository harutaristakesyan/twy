import { middyfy } from "@shared/index";
import {
  assertPermission,
  type GetOfficeExpenseEvent,
  GetOfficeExpenseEventSchema,
  getOfficeExpensePaymentOrder,
  loadAuthContext,
  type OfficeExpensePaymentOrderResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getOfficeExpense = async (
  event: GetOfficeExpenseEvent,
): Promise<OfficeExpensePaymentOrderResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "view");

  const { id } = event.pathParameters;
  const order = await getOfficeExpensePaymentOrder(id);
  if (!order) {
    throw new createError.NotFound("Office expense payment order not found");
  }
  return order;
};

export const handler = middyfy<
  GetOfficeExpenseEvent,
  OfficeExpensePaymentOrderResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getOfficeExpense, { eventSchema: GetOfficeExpenseEventSchema, mode: "parse" });
