import { type UploadFileEvent, UploadFileEventSchema } from "@contracts/file/request";
import type { UploadFileResponse } from "@contracts/file/response";
import { createUploadUrl } from "@libs/s3";
import { middyfy } from "@shared/index";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const uploadFile = async (event: UploadFileEvent): Promise<UploadFileResponse> => {
  const { fileName, contentType, size } = event.body;

  return await createUploadUrl({
    fileName,
    contentType,
    size,
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
