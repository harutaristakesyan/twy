import { middyfy } from "@twy/lambda-shared";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import {
  GetDownloadUrlEvent,
  GetDownloadUrlEventSchema,
} from "@contracts/file/request";
import { DownloadFileResponse } from "@contracts/file/response";
import { createDownloadUrl } from "@libs/s3";

const getDownloadUrl = async (
  event: GetDownloadUrlEvent,
): Promise<DownloadFileResponse> => {
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
