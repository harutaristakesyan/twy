import { middyfy } from "@shared/index";
import {
  assertPermission,
  type CreateOfficeExpenseEvent,
  CreateOfficeExpenseEventSchema,
  createOfficeExpensePaymentOrder,
  loadAuthContext,
  type OfficeExpensePaymentOrderResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createHandler = async (
  event: CreateOfficeExpenseEvent,
): Promise<OfficeExpensePaymentOrderResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "add");

  const { serviceName, paymentPurpose, periodStart, periodEnd, amount, currency } = event.body;

  return createOfficeExpensePaymentOrder({
    serviceName,
    paymentPurpose,
    periodStart,
    periodEnd,
    amount,
    currency,
    createdBy: userId,
  });
};

export const handler = middyfy<
  CreateOfficeExpenseEvent,
  OfficeExpensePaymentOrderResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createHandler, {
  eventSchema: CreateOfficeExpenseEventSchema,
  mode: "parse",
});
