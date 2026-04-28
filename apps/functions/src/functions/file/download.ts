import { type GetDownloadUrlEvent, GetDownloadUrlEventSchema } from "@contracts/file/request";
import type { DownloadFileResponse } from "@contracts/file/response";
import { createDownloadUrl } from "@libs/s3";
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const getDownloadUrl = async (event: GetDownloadUrlEvent): Promise<DownloadFileResponse> => {
  const { fileId } = event.pathParameters;

  return await createDownloadUrl({
    fileId,
  });
};

export const handler = middyfy<
  GetDownloadUrlEvent,
  DownloadFileResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getDownloadUrl, {
  eventSchema: GetDownloadUrlEventSchema,
  mode: "parse",
});
