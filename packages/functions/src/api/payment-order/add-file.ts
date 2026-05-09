import { middyfy } from "@shared/index";
import {
  type AddPaymentOrderFileEvent,
  AddPaymentOrderFileEventSchema,
  addPaymentOrderInvoice,
  assertPermission,
  loadAuthContext,
  type MessageResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const addFileHandler = async (event: AddPaymentOrderFileEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "payment_orders", "edit");

  const { paymentOrderId } = event.pathParameters;
  const { fileId } = event.body;

  await addPaymentOrderInvoice(paymentOrderId, fileId);

  return { message: "Invoice added to payment order" };
};

export const handler = middyfy<
  AddPaymentOrderFileEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(addFileHandler, {
  eventSchema: AddPaymentOrderFileEventSchema,
  mode: "parse",
});
