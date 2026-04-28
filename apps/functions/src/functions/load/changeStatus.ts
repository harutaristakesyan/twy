import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { changeLoadStatus as changeLoadStatusRecord } from "@libs/db/operations/loadOperations";
import {
  ChangeLoadStatusEvent,
  ChangeLoadStatusEventSchema,
} from "@contracts/load/request";
import { ChangeLoadStatusResponse } from "@contracts/load/response";

const changeLoadStatus = async (
  event: ChangeLoadStatusEvent,
): Promise<ChangeLoadStatusResponse> => {
  const { loadId } = event.pathParameters;
  const { status } = event.body;
  const changedBy = event.requestContext.authUser.userId;

  const { updated, statusChangedByEmail } = await changeLoadStatusRecord(
    loadId,
    status,
    changedBy,
  );

  if (!updated) {
    throw new createError.NotFound("Load not found");
  }

  return {
    message: "Load status updated successfully",
    loadId,
    status,
    statusChangedBy: statusChangedByEmail,
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
