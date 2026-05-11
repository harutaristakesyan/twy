import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  carrierResource,
  type DeleteCarrierEvent,
  DeleteCarrierEventSchema,
  deleteCarrier,
  getCarrierById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const deleteCarrierHandler = async (event: DeleteCarrierEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);

  const { carrierId } = event.pathParameters;
  const existing = await getCarrierById(carrierId);
  if (existing === null) {
    throw new createError.NotFound("Carrier not found");
  }
  assertPermission(ctx, carrierResource(existing.kind), "delete");

  await deleteCarrier(carrierId);
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
