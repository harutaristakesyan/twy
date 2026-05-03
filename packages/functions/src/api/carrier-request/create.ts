import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  carrierResource,
  createCarrierRequest,
  loadAuthContext,
  type SubmitCarrierRequestEvent,
  SubmitCarrierRequestEventSchema,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const submitCarrierRequestHandler = async (
  event: SubmitCarrierRequestEvent,
): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
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
  } = event.body;

  assertPermission(ctx, carrierResource(kind), "add");

  await createCarrierRequest({
    kind,
    carrierName,
    mcDotNumber,
    equipmentType,
    insuranceStatus,
    insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
    phone,
    email,
    notes,
    submittedBy: userId,
  });

  return { message: "Carrier request submitted successfully" };
};

export const handler = middyfy<
  SubmitCarrierRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(submitCarrierRequestHandler, {
  eventSchema: SubmitCarrierRequestEventSchema,
  mode: "parse",
});
