import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core/file";
import {
  type BatchDeleteFilesEvent,
  BatchDeleteFilesEventSchema,
  batchDeleteFiles,
} from "@twy/core/file";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const batchDelete = async (event: BatchDeleteFilesEvent): Promise<MessageResponse> => {
  const { fileIds } = event.body;
  const { userId } = event.requestContext.authUser;

  const { deleted } = await batchDeleteFiles({ fileIds, callerUserId: userId });

  return { message: `Deleted ${deleted.length} file${deleted.length === 1 ? "" : "s"}` };
};

export const handler = middyfy<
  BatchDeleteFilesEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(batchDelete, {
  eventSchema: BatchDeleteFilesEventSchema,
  mode: "parse",
});
