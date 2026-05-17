import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  type GetPaymentOrderEvent,
  GetPaymentOrderEventSchema,
  getPaymentOrderById,
  loadAuthContext,
  type PaymentOrderResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getPaymentOrder = async (event: GetPaymentOrderEvent): Promise<PaymentOrderResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "load_payment_order", "view");
  const scope = buildScope(ctx);

  const { paymentOrderId } = event.pathParameters;
  const paymentOrder = await getPaymentOrderById(paymentOrderId);
  if (!paymentOrder) {
    throw new createError.NotFound("Payment order not found");
  }
  if (scope.denyAll || (scope.branchId && paymentOrder.branchId !== scope.branchId)) {
    throw new createError.NotFound("Payment order not found");
  }

  return paymentOrder;
};

export const handler = middyfy<
  GetPaymentOrderEvent,
  PaymentOrderResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getPaymentOrder, { eventSchema: GetPaymentOrderEventSchema, mode: "parse" });
