import { middyfy } from "@shared/index";
import type { CarrierResponse } from "@twy/core";
import {
  assertPermission,
  carrierResource,
  type GetCarrierEvent,
  GetCarrierEventSchema,
  getCarrierById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getCarrier = async (event: GetCarrierEvent): Promise<CarrierResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);

  const { carrierId } = event.pathParameters;
  const carrier = await getCarrierById(carrierId);
  if (carrier === null) {
    throw new createError.NotFound("Carrier not found");
  }

  assertPermission(ctx, carrierResource(carrier.kind), "view");
  return carrier;
};

export const handler = middyfy<
  GetCarrierEvent,
  CarrierResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getCarrier, {
  eventSchema: GetCarrierEventSchema,
  mode: "parse",
});
