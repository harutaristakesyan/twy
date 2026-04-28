import type { MessageResponse } from "@contracts/common/response";
import { type DeleteFileEvent, DeleteFileEventSchema } from "@contracts/file/request";
import { deleteFile as deleteFromStorage } from "@libs/s3";
import { middyfy } from "@twy/lambda-shared";
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
