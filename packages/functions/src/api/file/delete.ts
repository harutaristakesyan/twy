import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core/file";
import {
  type DeleteFileEvent,
  DeleteFileEventSchema,
  deleteFile as deleteFromStorage,
} from "@twy/core/file";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const deleteFile = async (event: DeleteFileEvent): Promise<MessageResponse> => {
  const { fileId } = event.pathParameters;

  await deleteFromStorage(fileId);

  return {
    message: "File deleted successfully",
  };
};

export const handler = middyfy<
  DeleteFileEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(deleteFile, {
  eventSchema: DeleteFileEventSchema,
  mode: "parse",
});
