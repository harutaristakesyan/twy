import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  loadAuthContext,
  type UpdateCarrierEvent,
  UpdateCarrierEventSchema,
  updateCarrier,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const updateCarrierHandler = async (event: UpdateCarrierEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers", "edit");

  const { carrierId } = event.pathParameters;

  const {
    carrierName,
    mcDotNumber,
    equipmentType,
    insuranceStatus,
    insuranceExpiry,
    phone,
    email,
    notes,
    status,
  } = event.body;

  const result = await updateCarrier(carrierId, {
    carrierName,
    mcDotNumber,
    equipmentType,
    insuranceStatus,
    insuranceExpiry:
      insuranceExpiry !== undefined
        ? insuranceExpiry
          ? new Date(insuranceExpiry)
          : null
        : undefined,
    phone,
    email,
    notes,
    status,
  });

  if (result === null) {
    throw new createError.NotFound("Carrier not found");
  }

  return { message: "Carrier updated successfully" };
};

export const handler = middyfy<
  UpdateCarrierEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateCarrierHandler, {
  eventSchema: UpdateCarrierEventSchema,
  mode: "parse",
});
