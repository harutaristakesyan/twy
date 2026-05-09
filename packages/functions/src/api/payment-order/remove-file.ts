import { middyfy } from "@shared/index";
import {
  assertPermission,
  loadAuthContext,
  type MessageResponse,
  type RemovePaymentOrderFileEvent,
  RemovePaymentOrderFileEventSchema,
  removePaymentOrderInvoice,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const removeFileHandler = async (event: RemovePaymentOrderFileEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "edit");

  const { paymentOrderId, fileId } = event.pathParameters;

  const removed = await removePaymentOrderInvoice(paymentOrderId, fileId);
  if (!removed) throw new errors.NotFound("Invoice not found on this payment order");

  return { message: "Invoice removed from payment order" };
};

export const handler = middyfy<
  RemovePaymentOrderFileEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(removeFileHandler, {
  eventSchema: RemovePaymentOrderFileEventSchema,
  mode: "parse",
});
