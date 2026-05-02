import { middyfy } from "@shared/index";
import type { DownloadFileResponse } from "@twy/core";
import { createDownloadUrl, type GetDownloadUrlEvent, GetDownloadUrlEventSchema } from "@twy/core";
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
