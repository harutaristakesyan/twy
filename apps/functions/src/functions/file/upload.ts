import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import {
  UploadFileEvent,
  UploadFileEventSchema,
} from "@contracts/file/request";
import { UploadFileResponse } from "@contracts/file/response";
import { createUploadUrl } from "@libs/s3";

const uploadFile = async (
  event: UploadFileEvent,
): Promise<UploadFileResponse> => {
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
