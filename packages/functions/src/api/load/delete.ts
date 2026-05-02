import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type DeleteLoadEvent,
  DeleteLoadEventSchema,
  deleteLoad as deleteLoadRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

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
