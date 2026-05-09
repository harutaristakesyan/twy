import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type ListPaymentOrdersEvent,
  ListPaymentOrdersEventSchema,
  listPaymentOrders,
  loadAuthContext,
  type PaymentOrderListResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listPaymentOrdersHandler = async (
  event: ListPaymentOrdersEvent,
): Promise<PaymentOrderListResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "view");
  const scope = buildScope(ctx);
  if (scope.denyAll) return { paymentOrders: [], total: 0 };

  const { page, limit } = event.queryStringParameters;

  return listPaymentOrders({ page, limit, branchId: scope.branchId });
};

export const handler = middyfy<
  ListPaymentOrdersEvent,
  PaymentOrderListResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listPaymentOrdersHandler, {
  eventSchema: ListPaymentOrdersEventSchema,
  mode: "parse",
});
