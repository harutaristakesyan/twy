import { middyfy } from "@shared/index";
import {
  assertPermission,
  buildScope,
  getOfficeExpensePaymentOrder,
  loadAuthContext,
  type MessageResponse,
  type RemoveOfficeExpenseFileEvent,
  RemoveOfficeExpenseFileEventSchema,
  removeOfficeExpenseFile,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const removeFileHandler = async (event: RemoveOfficeExpenseFileEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "edit");
  const scope = buildScope(ctx);

  const { id, fileId } = event.pathParameters;

  const order = await getOfficeExpensePaymentOrder(id);
  if (!order) throw new errors.NotFound(`Office expense payment order ${id} not found`);
  if (scope.ownerId && order.createdBy !== scope.ownerId)
    throw new errors.NotFound(`Office expense payment order ${id} not found`);

  const removed = await removeOfficeExpenseFile(id, fileId);
  if (!removed) throw new errors.NotFound(`File ${fileId} not found on order ${id}`);

  return { message: "File removed from office expense payment order" };
};

export const handler = middyfy<
  RemoveOfficeExpenseFileEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(removeFileHandler, {
  eventSchema: RemoveOfficeExpenseFileEventSchema,
  mode: "parse",
});
