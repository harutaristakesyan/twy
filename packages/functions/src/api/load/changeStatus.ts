import { middyfy } from "@shared/index";
import type { ChangeLoadStatusResponse } from "@twy/core";
import {
  assertPermission,
  type ChangeLoadStatusEvent,
  ChangeLoadStatusEventSchema,
  changeLoadStatus as changeLoadStatusRecord,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const changeLoadStatus = async (
  event: ChangeLoadStatusEvent,
): Promise<ChangeLoadStatusResponse> => {
  const changedBy = event.requestContext.authUser.userId;
  const ctx = await loadAuthContext(changedBy);
  assertPermission(ctx, "loads", "edit");

  const { loadId } = event.pathParameters;
  const { status, isChargable = false, chargeAmount = null } = event.body;

  const { updated } = await changeLoadStatusRecord(
    loadId,
    status,
    changedBy,
    isChargable,
    chargeAmount ?? null,
  );

  if (!updated) {
    throw new createError.NotFound("Load not found");
  }

  return {
    message: "Load status updated successfully",
    loadId,
    status,
  };
};

export const handler = middyfy<
  ChangeLoadStatusEvent,
  ChangeLoadStatusResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(changeLoadStatus, {
  eventSchema: ChangeLoadStatusEventSchema,
  mode: "parse",
});
