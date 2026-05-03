import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  createBrokerRequest,
  loadAuthContext,
  type SubmitBrokerRequestEvent,
  SubmitBrokerRequestEventSchema,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const submitBrokerRequestHandler = async (
  event: SubmitBrokerRequestEvent,
): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  const {
    brokerName,
    mcNumber,
    contactName,
    phone,
    email,
    address,
    notes,
    branchId,
    creditLimitUnlimited,
    creditLimit,
  } = event.body;

  assertPermission(ctx, "brokers", "add");

  await createBrokerRequest({
    brokerName,
    mcNumber,
    contactName: contactName ?? null,
    phone: phone ?? null,
    email: email ?? null,
    address: address ?? null,
    notes: notes ?? null,
    branchId: branchId ?? null,
    creditLimitUnlimited,
    creditLimit: creditLimit ?? null,
    submittedBy: userId,
  });

  return { message: "Broker request submitted successfully" };
};

export const handler = middyfy<
  SubmitBrokerRequestEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(submitBrokerRequestHandler, {
  eventSchema: SubmitBrokerRequestEventSchema,
  mode: "parse",
});
