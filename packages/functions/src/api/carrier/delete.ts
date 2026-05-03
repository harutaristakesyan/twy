import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type DeleteCarrierEvent,
  DeleteCarrierEventSchema,
  deleteCarrier,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteCarrierHandler = async (event: DeleteCarrierEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers", "edit");

  const { carrierId } = event.pathParameters;

  const removed = await deleteCarrier(carrierId);

  if (!removed) {
    throw new createError.NotFound("Carrier not found");
  }

  return { message: "Carrier deleted successfully" };
};

export const handler = middyfy<
  DeleteCarrierEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteCarrierHandler, {
  eventSchema: DeleteCarrierEventSchema,
  mode: "parse",
});
