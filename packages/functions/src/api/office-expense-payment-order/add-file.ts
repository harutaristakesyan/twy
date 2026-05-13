import { middyfy } from "@shared/index";
import {
  type AddOfficeExpenseFileEvent,
  AddOfficeExpenseFileEventSchema,
  addOfficeExpenseFile,
  assertPermission,
  buildScope,
  getOfficeExpensePaymentOrder,
  loadAuthContext,
  type MessageResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

const addFileHandler = async (event: AddOfficeExpenseFileEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "office_expense_payment_order", "edit");
  const scope = buildScope(ctx);

  const { id } = event.pathParameters;
  const { fileId } = event.body;

  const order = await getOfficeExpensePaymentOrder(id);
  if (!order) throw new errors.NotFound(`Office expense payment order ${id} not found`);
  if (scope.ownerId && order.createdBy !== scope.ownerId)
    throw new errors.NotFound(`Office expense payment order ${id} not found`);

  await addOfficeExpenseFile(id, fileId);

  return { message: "File added to office expense payment order" };
};

export const handler = middyfy<
  AddOfficeExpenseFileEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(addFileHandler, {
  eventSchema: AddOfficeExpenseFileEventSchema,
  mode: "parse",
});
