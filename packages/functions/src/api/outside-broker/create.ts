import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  type CreateBrokerEvent,
  CreateBrokerEventSchema,
  createBroker as createBrokerRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const createBroker = async (event: CreateBrokerEvent): Promise<MessageResponse> => {
  const {
    brokerName,
    mcNumber,
    contactName,
    phone,
    email,
    address,
    notes,
    status,
    branchId,
    creditLimitUnlimited,
    creditLimit,
  } = event.body;
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "brokers", "add");

  await createBrokerRecord({
    brokerName,
    mcNumber,
    contactName: contactName ?? null,
    phone: phone ?? null,
    email: email ?? null,
    address: address ?? null,
    notes: notes ?? null,
    status,
    branchId: branchId ?? null,
    creditLimitUnlimited,
    creditLimit: creditLimit ?? null,
    createdBy: userId,
  });

  return { message: "Outside broker created successfully" };
};

export const handler = middyfy<
  CreateBrokerEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createBroker, {
  eventSchema: CreateBrokerEventSchema,
  mode: "parse",
});
