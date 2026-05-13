import { middyfy } from "@shared/index";
import type { UploadFileResponse } from "@twy/core/file";
import { createUploadUrl, type UploadFileEvent, UploadFileEventSchema } from "@twy/core/file";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const uploadFile = async (event: UploadFileEvent): Promise<UploadFileResponse> => {
  const { fileName, contentType, size } = event.body;
  const { userId } = event.requestContext.authUser;

  return await createUploadUrl({
    fileName,
    contentType,
    size,
    uploadedByUserId: userId,
  });
};

export const handler = middyfy<
  UploadFileEvent,
  UploadFileResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(uploadFile, {
  eventSchema: UploadFileEventSchema,
  mode: "parse",
});
