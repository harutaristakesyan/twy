import { middyfy } from "@shared/index";
import {
  assertPermission,
  assertTransition,
  loadAuthContext,
  type MessageResponse,
  type UpdatePaymentOrderEvent,
  UpdatePaymentOrderEventSchema,
  updatePaymentOrder,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const updatePaymentOrderHandler = async (
  event: UpdatePaymentOrderEvent,
): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "load_payment_order", "edit");

  const { paymentOrderId } = event.pathParameters;
  const {
    paymentStatus,
    carrierPaidAmount,
    carrierPaidDate,
    brokerReceivedAmount,
    brokerReceivedDate,
  } = event.body;

  if (paymentStatus) assertTransition(ctx, "load_payment_order", paymentStatus);

  const updated = await updatePaymentOrder(paymentOrderId, {
    paymentStatus,
    carrierPaidAmount,
    carrierPaidDate,
    brokerReceivedAmount,
    brokerReceivedDate,
  });
  if (!updated) throw new errors.NotFound(`Payment order ${paymentOrderId} not found`);

  return { message: "Payment order updated" };
};

export const handler = middyfy<
  UpdatePaymentOrderEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updatePaymentOrderHandler, {
  eventSchema: UpdatePaymentOrderEventSchema,
  mode: "parse",
});
