import { middyfy } from "@shared/index";
import {
  assertPermission,
  assertTransition,
  buildScope,
  getOfficeExpensePaymentOrder,
  loadAuthContext,
  type MessageResponse,
  type UpdateOfficeExpenseEvent,
  UpdateOfficeExpenseEventSchema,
  updateOfficeExpensePaymentOrder,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const updateHandler = async (event: UpdateOfficeExpenseEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "edit");
  const scope = buildScope(ctx);

  const { id } = event.pathParameters;
  const {
    serviceName,
    paymentPurpose,
    periodStart,
    periodEnd,
    amount,
    currency,
    paymentStatus,
    paymentMadeOn,
  } = event.body;

  const existing = await getOfficeExpensePaymentOrder(id);
  if (!existing) throw new errors.NotFound(`Office expense payment order ${id} not found`);
  if (scope.ownerId && existing.createdBy !== scope.ownerId)
    throw new errors.NotFound(`Office expense payment order ${id} not found`);

  if (paymentStatus) assertTransition(ctx, "office_expense_payment_order", paymentStatus);
  // paymentMadeOn without a status change still requires the Paid transition permission
  if (paymentMadeOn !== undefined && !paymentStatus)
    assertTransition(ctx, "office_expense_payment_order", "Paid");

  const updated = await updateOfficeExpensePaymentOrder(id, {
    serviceName,
    paymentPurpose,
    periodStart,
    periodEnd,
    amount,
    currency,
    paymentStatus,
    paymentMadeOn,
  });
  if (!updated) throw new errors.NotFound(`Office expense payment order ${id} not found`);

  return { message: "Office expense payment order updated" };
};

export const handler = middyfy<
  UpdateOfficeExpenseEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateHandler, {
  eventSchema: UpdateOfficeExpenseEventSchema,
  mode: "parse",
});
