import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type CreateBrokerEvent,
  CreateBrokerEventSchema,
  createBroker as createBrokerRecord,
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
