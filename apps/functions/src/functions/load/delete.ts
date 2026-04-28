import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";
import { deleteLoad as deleteLoadRecord } from "@libs/db/operations/loadOperations";
import {
  DeleteLoadEvent,
  DeleteLoadEventSchema,
} from "@contracts/load/request";
import { MessageResponse } from "@contracts/common/response";

const deleteLoad = async (event: DeleteLoadEvent): Promise<MessageResponse> => {
  const { loadId } = event.pathParameters;

  const removed = await deleteLoadRecord(loadId);

  if (!removed) {
    throw new createError.NotFound("Load not found");
  }

  return { message: "Load deleted successfully" };
};

export const handler = middyfy<
  DeleteLoadEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteLoad, {
  eventSchema: DeleteLoadEventSchema,
  mode: "parse",
});
