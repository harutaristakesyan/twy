import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import {
  DeleteFileEvent,
  DeleteFileEventSchema,
} from "@contracts/file/request";
import { MessageResponse } from "@contracts/common/response";
import { deleteFile as deleteFromStorage } from "@libs/s3";

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
