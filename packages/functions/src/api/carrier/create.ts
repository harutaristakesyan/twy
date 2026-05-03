import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type CreateCarrierEvent,
  CreateCarrierEventSchema,
  createCarrier,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createCarrierHandler = async (event: CreateCarrierEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "carriers", "add");

  const {
    kind,
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

  await createCarrier({
    kind,
    carrierName,
    mcDotNumber,
    equipmentType,
    insuranceStatus,
    insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
    phone,
    email,
    notes,
    status,
    createdBy: userId,
  });

  return { message: "Carrier created successfully" };
};

export const handler = middyfy<
  CreateCarrierEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createCarrierHandler, {
  eventSchema: CreateCarrierEventSchema,
  mode: "parse",
});
