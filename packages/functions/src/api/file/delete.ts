import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core/file";
import { type DeleteFileEvent, DeleteFileEventSchema, deleteOwnedFile } from "@twy/core/file";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const deleteFile = async (event: DeleteFileEvent): Promise<MessageResponse> => {
  const { fileId } = event.pathParameters;
  const { userId } = event.requestContext.authUser;

  await deleteOwnedFile({ fileId, callerUserId: userId });

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
