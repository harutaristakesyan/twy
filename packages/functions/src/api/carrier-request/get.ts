import { middyfy } from "@shared/index";
import {
  assertPermission,
  type CarrierRequestResponse,
  type GetCarrierRequestEvent,
  GetCarrierRequestEventSchema,
  getCarrierRequestById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getCarrierRequest = async (
  event: GetCarrierRequestEvent,
): Promise<CarrierRequestResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers_requests", "view");

  const { requestId } = event.pathParameters;
  const request = await getCarrierRequestById(requestId);
  if (!request) {
    throw new createError.NotFound("Carrier request not found");
  }
  return request;
};

export const handler = middyfy<
  GetCarrierRequestEvent,
  CarrierRequestResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getCarrierRequest, { eventSchema: GetCarrierRequestEventSchema, mode: "parse" });
